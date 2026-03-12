import {COURIER_RULES} from '../constants';
import {CourierInfo, ValidationRule} from '../types';

/** 识别快递公司 */
export function detectCourier(value: string): CourierInfo | undefined {
  for (const rule of COURIER_RULES) {
    if (rule.pattern.test(value.trim())) {
      return rule.info;
    }
  }
  return undefined;
}

/** 防呆验证 */
export function validateBarcode(
  value: string,
  rules: ValidationRule[],
): {pass: boolean; msg: string} {
  const enabledRules = rules.filter(r => r.enabled && r.pattern);
  if (enabledRules.length === 0) {
    return {pass: true, msg: ''};
  }
  for (const rule of enabledRules) {
    try {
      const re = new RegExp(rule.pattern);
      if (re.test(value)) {
        return {pass: true, msg: rule.name};
      }
    } catch {
      // 正则无效跳过
    }
  }
  return {pass: false, msg: enabledRules.map(r => r.name).join(' / ')};
}

/** 格式化时间 */
export function formatTime(ts: number, lang: 'zh' | 'en' = 'zh'): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  if (lang === 'en') {
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 生成唯一ID */
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

/** WiFi suffix 转义 */
export function resolveSuffix(suffix: string): string {
  return suffix.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
}
