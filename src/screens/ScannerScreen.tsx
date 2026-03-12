import React, {useRef, useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {BarcodeFormat, scanBarcodes} from 'vision-camera-code-scanner';
import {runOnJS} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {useApp} from '../context/AppContext';
import {ScanRecord} from '../types';
import {formatTime} from '../utils';

type ScanMode = 'barcode' | 'ocr';

const ScannerScreen = () => {
  const navigation = useNavigation();
  const {addRecord, forceAddRecord, settings, lang, wifiStatus, uploadPhoto} = useApp();
  const devices = useCameraDevices();
  const device = devices.back;
  const cameraRef = useRef<Camera>(null);

  const [mode, setMode] = useState<ScanMode>('barcode');
  const [torch, setTorch] = useState<'on' | 'off'>('off');
  const [scannedCount, setScannedCount] = useState(0);
  const [lastRecord, setLastRecord] = useState<ScanRecord | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  // 重复弹窗状态
  const [dupDialog, setDupDialog] = useState<{
    visible: boolean;
    value: string;
    type: string;
    source: 'camera' | 'ocr';
    prevTime: string;
  } | null>(null);
  const cooldownRef = useRef(false);

  // 声音播放
  const playBeep = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      const Sound = require('react-native-sound');
      Sound.setCategory('Playback');
      const beep = new Sound('beep.mp3', Sound.MAIN_BUNDLE, (err: any) => {
        if (!err) beep.play();
      });
    } catch {}
  }, [settings.soundEnabled]);

  /** 拍照并上传云端 */
  const takePhotoAndUpload = useCallback(
    async (recordId: string) => {
      if (!settings.photoEnabled || !settings.cloudConfig.enabled) return;
      if (!cameraRef.current) return;
      try {
        setPhotoUploading(true);
        const photo = await cameraRef.current.takePhoto({
          qualityPrioritization: 'speed',
          flash: 'off',
          enableShutterSound: false,
        });
        const uri = `file://${photo.path}`;
        await uploadPhoto(recordId, uri);
      } catch {
        // 拍照/上传失败静默处理，不影响主扫码流程
      } finally {
        setPhotoUploading(false);
      }
    },
    [settings.photoEnabled, settings.cloudConfig.enabled, uploadPhoto],
  );

  const onScanned = useCallback(
    (value: string, type: string, source: 'camera' | 'ocr' = 'camera') => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, settings.cooldownMs);

      const result = addRecord(value, type, source);

      if (result.isDuplicate && result.prevRecord) {
        // 重复：震动三短提示，弹窗提示上次时间
        if (settings.vibrationEnabled) {
          Vibration.vibrate([0, 50, 50, 50, 50, 50]);
        }
        setDupDialog({
          visible: true,
          value,
          type,
          source,
          prevTime: formatTime(result.prevRecord.timestamp, settings.language),
        });
        return;
      }

      if (result.record) {
        // 成功录入：震动 + 提示音 + 拍照上传
        if (settings.vibrationEnabled) {
          Vibration.vibrate(source === 'ocr' ? [0, 60, 40, 60] : 80);
        }
        playBeep();
        setLastRecord(result.record);
        setScannedCount(prev => prev + 1);
        // 异步拍照上传，不阻塞UI
        takePhotoAndUpload(result.record.id);
      }
    },
    [addRecord, settings, playBeep, takePhotoAndUpload],
  );

  // 强制录入（重复弹窗确认后）
  const handleForceAdd = useCallback(() => {
    if (!dupDialog) return;
    const {value, type, source} = dupDialog;
    setDupDialog(null);
    if (settings.vibrationEnabled) Vibration.vibrate(80);
    playBeep();
    const record = forceAddRecord(value, type, source);
    setLastRecord(record);
    setScannedCount(prev => prev + 1);
    // 强制录入也触发拍照上传
    takePhotoAndUpload(record.id);
  }, [dupDialog, forceAddRecord, settings.vibrationEnabled, playBeep, takePhotoAndUpload]);

  // 条码帧处理
  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      if (mode !== 'barcode') return;
      const barcodes = scanBarcodes(frame, [BarcodeFormat.ALL_FORMATS]);
      if (barcodes.length > 0) {
        const bc = barcodes[0];
        const val = bc.displayValue ?? '';
        const typ = bc.format?.toString() ?? 'BARCODE';
        if (val) runOnJS(onScanned)(val, typ, 'camera');
      }
    },
    [mode, onScanned],
  );

  // OCR 手动触发
  const handleOCR = useCallback(async () => {
    if (!device || ocrLoading) return;
    setOcrLoading(true);
    try {
      const TextRecognition = require('react-native-text-recognition');
      // 拍照并识别
      const result: string[] = await TextRecognition.recognize();
      if (result && result.length > 0) {
        const text = result.join(' ').trim();
        if (text) onScanned(text, 'OCR', 'ocr');
      }
    } catch (e) {
      Alert.alert('OCR', lang.uploadFail);
    } finally {
      setOcrLoading(false);
    }
  }, [device, ocrLoading, onScanned, lang]);

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>摄像头不可用 / Camera unavailable</Text>
      </View>
    );
  }

  const wifiDotColor =
    wifiStatus === 'connected' ? '#4CD964' : wifiStatus === 'connecting' ? '#FFD60A' : '#FF3B30';

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={mode === 'barcode' ? frameProcessor : undefined}
        frameProcessorFps={5}
        torch={torch}
        photo={true}
      />

      {/* 顶部栏 */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'barcode' && styles.modeBtnActive]}
            onPress={() => setMode('barcode')}>
            <Text style={[styles.modeBtnText, mode === 'barcode' && styles.modeBtnTextActive]}>
              {lang.scanMode}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'ocr' && styles.modeBtnActive]}
            onPress={() => setMode('ocr')}>
            <Text style={[styles.modeBtnText, mode === 'ocr' && styles.modeBtnTextActive]}>
              {lang.ocrMode}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topRight}>
          {/* WiFi 状态指示 */}
          <View style={[styles.wifiDot, {backgroundColor: wifiDotColor}]} />
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setTorch(t => (t === 'on' ? 'off' : 'on'))}>
            <Text style={styles.iconBtnText}>{torch === 'on' ? '🔦' : '💡'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 扫码框 */}
      <View style={styles.scanArea}>
        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {mode === 'barcode' && <View style={styles.scanLine} />}
        </View>
        <Text style={styles.scanTip}>
          {mode === 'barcode' ? lang.scanTip : lang.ocrTip}
        </Text>
      </View>

      {/* 底部栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.countBox}>
          <Text style={styles.countNum}>{scannedCount}</Text>
          <Text style={styles.countLabel}>{lang.scanned}</Text>
        </View>

        <View style={styles.lastBox}>
          {lastRecord ? (
            <>
              <View style={styles.lastTopRow}>
                <Text style={styles.lastType}>{lastRecord.type}</Text>
                {lastRecord.courier && (
                  <View style={[styles.courierBadge, {backgroundColor: lastRecord.courier.color}]}>
                    <Text style={styles.courierText}>
                      {settings.language === 'zh'
                        ? lastRecord.courier.company
                        : lastRecord.courier.companyEn}
                    </Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.validBadge,
                    {backgroundColor: lastRecord.validated ? '#34C759' : '#FF3B30'},
                  ]}>
                  {lastRecord.validated ? '✓' : '✗'}
                </Text>
                {/* 照片上传状态 */}
                {settings.photoEnabled && settings.cloudConfig.enabled && (
                  <View style={styles.photoBadge}>
                    {photoUploading ? (
                      <ActivityIndicator size="small" color="#00E5FF" style={{width: 14, height: 14}} />
                    ) : lastRecord.photoUploaded ? (
                      <Text style={styles.photoIcon}>📷✓</Text>
                    ) : lastRecord.photoUri ? (
                      <Text style={styles.photoIcon}>📷…</Text>
                    ) : null}
                  </View>
                )}
              </View>
              <Text style={styles.lastValue} numberOfLines={1}>
                {lastRecord.value}
              </Text>
            </>
          ) : (
            <Text style={styles.waitText}>{lang.waitScan}</Text>
          )}
        </View>

        {mode === 'ocr' ? (
          <TouchableOpacity
            style={styles.ocrTrigger}
            onPress={handleOCR}
            disabled={ocrLoading}>
            {ocrLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.ocrTriggerText}>识别</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.listBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.listBtnText}>{lang.records}</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* 重复条码弹窗 */}
      {dupDialog?.visible && (
        <View style={styles.dupOverlay}>
          <View style={styles.dupCard}>
            <View style={styles.dupIconRow}>
              <Text style={styles.dupIcon}>⚠️</Text>
              <Text style={styles.dupTitle}>{lang.duplicateTitle}</Text>
            </View>
            <Text style={styles.dupValue} numberOfLines={2}>{dupDialog.value}</Text>
            <View style={styles.dupTimeRow}>
              <Text style={styles.dupTimeLabel}>上次录入：</Text>
              <Text style={styles.dupTimeValue}>{dupDialog.prevTime}</Text>
            </View>
            <View style={styles.dupBtnRow}>
              <TouchableOpacity
                style={styles.dupIgnoreBtn}
                onPress={() => setDupDialog(null)}>
                <Text style={styles.dupIgnoreText}>{lang.duplicateIgnore}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dupForceBtn}
                onPress={handleForceAdd}>
                <Text style={styles.dupForceText}>{lang.duplicateForce}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const C = '#00E5FF';
const CS = 24;
const CT = 3;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'},
  errorText: {color: '#fff', fontSize: 15},

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  iconBtn: {width: 36, height: 36, justifyContent: 'center', alignItems: 'center'},
  iconBtnText: {color: '#fff', fontSize: 16},
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 2,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 18,
  },
  modeBtnActive: {backgroundColor: C},
  modeBtnText: {color: 'rgba(255,255,255,0.7)', fontSize: 12},
  modeBtnTextActive: {color: '#000', fontWeight: '700'},
  topRight: {flexDirection: 'row', alignItems: 'center', gap: 4},
  wifiDot: {width: 8, height: 8, borderRadius: 4, marginRight: 4},

  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 64,
    marginBottom: 110,
  },
  scanBox: {width: 250, height: 250, justifyContent: 'center', alignItems: 'center'},
  corner: {position: 'absolute', width: CS, height: CS, borderColor: C},
  cornerTL: {top: 0, left: 0, borderTopWidth: CT, borderLeftWidth: CT},
  cornerTR: {top: 0, right: 0, borderTopWidth: CT, borderRightWidth: CT},
  cornerBL: {bottom: 0, left: 0, borderBottomWidth: CT, borderLeftWidth: CT},
  cornerBR: {bottom: 0, right: 0, borderBottomWidth: CT, borderRightWidth: CT},
  scanLine: {
    position: 'absolute',
    top: '50%', left: 8, right: 8,
    height: 2,
    backgroundColor: C,
    opacity: 0.85,
  },
  scanTip: {marginTop: 14, color: 'rgba(255,255,255,0.65)', fontSize: 13},

  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 110,
    backgroundColor: 'rgba(0,0,0,0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  countBox: {alignItems: 'center', minWidth: 44},
  countNum: {color: C, fontSize: 26, fontWeight: '700'},
  countLabel: {color: 'rgba(255,255,255,0.5)', fontSize: 10},
  lastBox: {flex: 1},
  lastTopRow: {flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3},
  lastType: {
    color: '#fff', fontSize: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  courierBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  courierText: {color: '#fff', fontSize: 10, fontWeight: '600'},
  validBadge: {
    width: 18, height: 18, borderRadius: 9,
    textAlign: 'center', lineHeight: 18,
    color: '#fff', fontSize: 11, fontWeight: '700',
    overflow: 'hidden',
  },
  photoBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
  },
  photoIcon: {fontSize: 11, color: 'rgba(255,255,255,0.8)'},
  lastValue: {color: '#fff', fontSize: 13},
  waitText: {color: 'rgba(255,255,255,0.4)', fontSize: 13},
  listBtn: {
    backgroundColor: C,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  listBtnText: {color: '#000', fontSize: 13, fontWeight: '700'},
  ocrTrigger: {
    backgroundColor: C,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 56,
    alignItems: 'center',
  },
  ocrTriggerText: {color: '#000', fontSize: 14, fontWeight: '700'},

  // 重复条码弹窗
  dupOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dupCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  dupIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  dupIcon: {fontSize: 20},
  dupTitle: {color: '#FF9500', fontSize: 16, fontWeight: '700'},
  dupValue: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    lineHeight: 20,
  },
  dupTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 4,
  },
  dupTimeLabel: {color: 'rgba(255,255,255,0.5)', fontSize: 12},
  dupTimeValue: {color: '#FFD60A', fontSize: 13, fontWeight: '600'},
  dupBtnRow: {flexDirection: 'row', gap: 10},
  dupIgnoreBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dupIgnoreText: {color: '#fff', fontSize: 14, fontWeight: '600'},
  dupForceBtn: {
    flex: 1,
    backgroundColor: '#FF9500',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dupForceText: {color: '#fff', fontSize: 14, fontWeight: '700'},
});

export default ScannerScreen;
