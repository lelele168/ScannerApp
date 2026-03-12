import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppSettings, ScanRecord, AddRecordResult, DuplicateWindow} from '../types';
import {DEFAULT_VALIDATION_RULES, I18N} from '../constants';
import {detectCourier, validateBarcode, genId} from '../utils';
import {addWatermark, getUploadFilename} from '../utils/watermark';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh',
  wifiConfig: {
    ip: '',
    port: 8888,
    enabled: false,
    suffix: '\\n',
  },
  validationRules: DEFAULT_VALIDATION_RULES,
  soundEnabled: true,
  vibrationEnabled: true,
  autoUpload: true,
  duplicateCheck: true,
  duplicateWindow: 86400000, // 默认 24 小时
  cooldownMs: 1500,
  photoEnabled: false,
  cloudConfig: {
    enabled: false,
    uploadUrl: '',
    token: '',
    fieldName: 'file',
    extraParams: '',
  },
};

interface AppContextType {
  records: ScanRecord[];
  settings: AppSettings;
  lang: typeof I18N['zh'];
  offlineQueue: ScanRecord[];
  wifiStatus: 'connected' | 'disconnected' | 'connecting';
  addRecord: (value: string, type: string, source?: 'camera' | 'ocr') => AddRecordResult;
  forceAddRecord: (value: string, type: string, source?: 'camera' | 'ocr') => ScanRecord;
  deleteRecord: (id: string) => void;
  clearAll: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  uploadOfflineQueue: () => Promise<void>;
  sendViaTcp: (value: string) => Promise<boolean>;
  setWifiStatus: (s: 'connected' | 'disconnected' | 'connecting') => void;
  uploadPhoto: (recordId: string, photoUri: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY_RECORDS = '@scanner_records';
const STORAGE_KEY_SETTINGS = '@scanner_settings';
const STORAGE_KEY_OFFLINE = '@scanner_offline';

export const AppProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [offlineQueue, setOfflineQueue] = useState<ScanRecord[]>([]);
  const [wifiStatus, setWifiStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const lastValuesRef = useRef<Set<string>>(new Set());

  const lang = I18N[settings.language];

  // 持久化加载
  useEffect(() => {
    (async () => {
      try {
        const [r, s, o] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_RECORDS),
          AsyncStorage.getItem(STORAGE_KEY_SETTINGS),
          AsyncStorage.getItem(STORAGE_KEY_OFFLINE),
        ]);
        if (r) setRecords(JSON.parse(r));
        if (s) setSettings({...DEFAULT_SETTINGS, ...JSON.parse(s)});
        if (o) setOfflineQueue(JSON.parse(o));
      } catch {}
    })();
  }, []);

  // 持久化保存
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records)).catch(() => {});
  }, [records]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_OFFLINE, JSON.stringify(offlineQueue)).catch(() => {});
  }, [offlineQueue]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings(prev => ({...prev, ...patch}));
  }, []);

  /** TCP 发送数据到电脑 */
  const sendViaTcp = useCallback(
    async (value: string): Promise<boolean> => {
      const {ip, port, enabled, suffix} = settings.wifiConfig;
      if (!enabled || !ip) return false;
      return new Promise(resolve => {
        try {
          const TcpSocket = require('react-native-tcp-socket');
          const client = TcpSocket.createConnection({host: ip, port}, () => {
            const data = value + suffix.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            client.write(data);
            client.destroy();
            resolve(true);
          });
          client.on('error', () => resolve(false));
          client.setTimeout(3000, () => {
            client.destroy();
            resolve(false);
          });
        } catch {
          resolve(false);
        }
      });
    },
    [settings.wifiConfig],
  );

  /** 内部：创建并保存记录（跳过重复检测）*/
  const _doAddRecord = useCallback(
    (value: string, type: string, source: 'camera' | 'ocr', photoUri?: string): ScanRecord => {
      const trimmed = value.trim();
      const {pass, msg: validationMsg} = validateBarcode(trimmed, settings.validationRules);
      const courier = detectCourier(trimmed);
      const record: ScanRecord = {
        id: genId(),
        value: trimmed,
        type,
        timestamp: Date.now(),
        validated: pass,
        validationMsg,
        courier,
        synced: false,
        source,
        photoUri,
        photoUploaded: false,
        photoUrl: undefined,
      };
      setRecords(prev => [record, ...prev]);
      // WiFi 传输
      if (settings.wifiConfig.enabled) {
        sendViaTcp(trimmed).then(ok => {
          if (ok) {
            setRecords(prev =>
              prev.map(r => (r.id === record.id ? {...r, synced: true} : r)),
            );
          } else {
            setOfflineQueue(prev => [...prev, {...record, synced: false}]);
          }
        });
      }
      return record;
    },
    [settings, sendViaTcp],
  );

  /**
   * uploadPhoto - 添加水印后上传照片到云端
   * 流程：原始照片 → 叠加单号+时间水印 → 以单号命名 → 上传
   * @param recordId  记录ID
   * @param photoUri  本地照片路径（来自 Camera.takePhoto）
   */
  const uploadPhoto = useCallback(
    async (recordId: string, photoUri: string): Promise<boolean> => {
      const {cloudConfig} = settings;
      if (!cloudConfig.enabled || !cloudConfig.uploadUrl) return false;

      // 找到对应记录获取单号和时间
      const record = records.find(r => r.id === recordId);
      const barcode = record?.value ?? recordId;
      const timestamp = record?.timestamp ?? Date.now();

      try {
        // Step 1: 添加水印（单号 + 扫描时间）并以单号命名
        const markedUri = await addWatermark(photoUri, barcode, timestamp);
        const filename = getUploadFilename(barcode, timestamp);

        // Step 2: 解析额外参数
        const extraObj: Record<string, string> = cloudConfig.extraParams
          ? JSON.parse(cloudConfig.extraParams)
          : {};

        // Step 3: 构建 FormData 上传
        const formData = new FormData();
        formData.append(cloudConfig.fieldName || 'file', {
          uri: markedUri,
          name: filename,           // 以单号命名的文件
          type: 'image/jpeg',
        } as any);
        formData.append('barcode', barcode);
        formData.append('recordId', recordId);
        formData.append('scanTime', new Date(timestamp).toISOString());
        Object.entries(extraObj).forEach(([k, v]) => formData.append(k, v));

        const headers: Record<string, string> = {};
        if (cloudConfig.token) {
          headers['Authorization'] = `Bearer ${cloudConfig.token}`;
        }

        const resp = await fetch(cloudConfig.uploadUrl, {
          method: 'POST',
          headers,
          body: formData,
        });

        // Step 4: 清理水印临时文件（如果和原始文件不同）
        try {
          if (markedUri !== photoUri) {
            const RNFS = require('react-native-fs');
            const p = markedUri.startsWith('file://') ? markedUri.slice(7) : markedUri;
            await RNFS.unlink(p);
          }
        } catch {}

        if (resp.ok) {
          let photoUrl: string | undefined;
          try {
            const json = await resp.json();
            photoUrl = json?.url ?? json?.data?.url ?? json?.path ?? undefined;
          } catch {}
          setRecords(prev =>
            prev.map(r =>
              r.id === recordId
                ? {...r, photoUploaded: true, photoUrl: photoUrl ?? r.photoUrl}
                : r,
            ),
          );
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [settings, records],
  );

  /**
   * addRecord - 带重复检测
   * 返回 AddRecordResult：
   *   isDuplicate=true 时 record=null，prevRecord 为上次录入记录
   *   isDuplicate=false 时 record 为新记录
   */
  const addRecord = useCallback(
    (value: string, type: string, source: 'camera' | 'ocr' = 'camera'): AddRecordResult => {
      const trimmed = value.trim();
      if (!trimmed) return {record: null, isDuplicate: false};

      // 冷却防抖（防止摄像头同一帧多次触发）
      if (lastValuesRef.current.has(trimmed)) {
        return {record: null, isDuplicate: false};
      }
      lastValuesRef.current.add(trimmed);
      setTimeout(() => lastValuesRef.current.delete(trimmed), settings.cooldownMs);

      // 重复检测
      if (settings.duplicateCheck && settings.duplicateWindow !== 0) {
        const now = Date.now();
        // 在 records 中查找相同值
        const prevRecord = records.find(r => {
          if (r.value !== trimmed) return false;
          if (settings.duplicateWindow === -1) return true; // 永久
          return now - r.timestamp < settings.duplicateWindow;
        });
        if (prevRecord) {
          return {record: null, isDuplicate: true, prevRecord};
        }
      }

      const record = _doAddRecord(trimmed, type, source);
      return {record, isDuplicate: false};
    },
    [settings, records, _doAddRecord],
  );

  /** forceAddRecord - 忽略重复检测，强制录入 */
  const forceAddRecord = useCallback(
    (value: string, type: string, source: 'camera' | 'ocr' = 'camera'): ScanRecord => {
      return _doAddRecord(value.trim(), type, source);
    },
    [_doAddRecord],
  );

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
  }, []);

  /** 上传离线队列 */
  const uploadOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;
    const remaining: ScanRecord[] = [];
    for (const record of offlineQueue) {
      const ok = await sendViaTcp(record.value);
      if (ok) {
        setRecords(prev =>
          prev.map(r => (r.id === record.id ? {...r, synced: true} : r)),
        );
      } else {
        remaining.push(record);
      }
    }
    setOfflineQueue(remaining);
  }, [offlineQueue, sendViaTcp]);

  // WiFi恢复自动上传
  useEffect(() => {
    if (wifiStatus === 'connected' && settings.autoUpload && offlineQueue.length > 0) {
      uploadOfflineQueue();
    }
  }, [wifiStatus, settings.autoUpload, offlineQueue.length, uploadOfflineQueue]);

  return (
    <AppContext.Provider
      value={{
        records,
        settings,
        lang,
        offlineQueue,
        wifiStatus,
      addRecord,
      forceAddRecord,
      deleteRecord,
        clearAll,
        updateSettings,
        uploadOfflineQueue,
        sendViaTcp,
        setWifiStatus,
        uploadPhoto,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
