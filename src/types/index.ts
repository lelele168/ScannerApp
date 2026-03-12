export interface ScanRecord {
  id: string;
  value: string;
  type: string;
  timestamp: number;
  validated: boolean;          // 防呆验证结果
  validationMsg: string;       // 验证提示
  courier?: CourierInfo;       // 快递识别结果
  synced: boolean;             // 是否已同步到电脑
  source: 'camera' | 'ocr';   // 扫码来源
  photoUri?: string;           // 本地照片路径
  photoUploaded: boolean;      // 照片是否已上传云端
  photoUrl?: string;           // 云端照片URL
}

export interface CourierInfo {
  company: string;
  companyEn: string;
  color: string;
}

export interface WifiConfig {
  ip: string;
  port: number;
  enabled: boolean;
  suffix: string;              // 发送后追加字符，如 \n \t
}

export interface ValidationRule {
  id: string;
  name: string;
  nameEn: string;
  pattern: string;
  enabled: boolean;
}

export type Language = 'zh' | 'en';

/**
 * 重复检测时间窗口
 * -1 = 永久（只要历史记录中存在就视为重复）
 *  0 = 关闭（允许重复）
 * 其他正整数 = 毫秒数
 */
export type DuplicateWindow =
  | 0          // 关闭，允许重复
  | 43200000   // 12小时
  | 86400000   // 24小时
  | 172800000  // 48小时
  | 604800000  // 一周
  | 2592000000 // 一个月
  | -1;        // 永久

export interface AppSettings {
  language: Language;
  wifiConfig: WifiConfig;
  validationRules: ValidationRule[];
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoUpload: boolean;          // WiFi恢复后自动上传离线记录
  duplicateCheck: boolean;      // 是否开启重复检测（总开关）
  duplicateWindow: DuplicateWindow; // 重复检测时间窗口
  cooldownMs: number;
  cloudConfig: CloudConfig;     // 云存储配置
  photoEnabled: boolean;        // 是否开启拍照上传
}

export interface CloudConfig {
  enabled: boolean;             // 开启云上传
  uploadUrl: string;            // 上传接口URL（POST multipart/form-data）
  token: string;                // 认证Token（Header: Authorization: Bearer <token>）
  fieldName: string;            // 文件字段名，默认 file
  extraParams: string;          // 额外参数 JSON 字符串，如 {"bucket":"scanner"}
}

/** addRecord 返回结果，包含重复信息 */
export interface AddRecordResult {
  record: ScanRecord | null;
  isDuplicate: boolean;
  prevRecord?: ScanRecord;  // 上次录入的记录
}
