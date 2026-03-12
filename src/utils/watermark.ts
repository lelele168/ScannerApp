/**
 * watermark.ts
 * 给扫码照片叠加文字水印（单号 + 扫描时间），并以单号重命名文件。
 *
 * 依赖：react-native-image-marker ^1.2.0
 * 文档：https://github.com/JimmyDaddy/react-native-image-marker
 */

import RNFS from 'react-native-fs';

/** 对单号进行文件名安全处理（去除特殊字符） */
function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 80);
}

/** 格式化时间为 "YYYY-MM-DD HH:mm:ss" */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * 在照片上叠加水印，返回处理后的图片本地路径（file://...）
 *
 * @param photoUri  原始照片路径（来自 Camera.takePhoto，如 /data/.../photo.jpg）
 * @param barcode   扫描的单号/条码内容
 * @param timestamp 扫描时间戳（ms）
 * @returns 带水印图片的本地 file:// 路径，失败时返回原始 photoUri
 */
export async function addWatermark(
  photoUri: string,
  barcode: string,
  timestamp: number,
): Promise<string> {
  try {
    const ImageMarker = require('react-native-image-marker').default
      ?? require('react-native-image-marker');

    const timeStr = fmtTime(timestamp);
    const safe = safeFilename(barcode);
    const outDir = RNFS.CachesDirectoryPath;
    const outPath = `${outDir}/${safe}_${timestamp}.jpg`;

    // 确保 URI 格式正确（react-native-image-marker 需要不含 file:// 前缀的绝对路径）
    const srcPath = photoUri.startsWith('file://') ? photoUri.slice(7) : photoUri;

    // 水印文本行1：单号（较大字体，放在左下角）
    // 水印文本行2：时间（较小字体，在单号下方）
    // 使用两次叠加实现两行文字
    const line1Result: string = await ImageMarker.markText({
      src: srcPath,
      text: barcode,
      X: 16,          // 距左边距
      Y: -60,         // 负值表示距底部（部分版本以图片高度-|Y|定位）
      color: '#FFFFFF',
      fontName: 'Arial',
      fontSize: 28,
      scale: 1,
      quality: 90,
      saveFormat: 'jpg',
      filename: `__tmp_${safe}_${timestamp}`,
      // 文字阴影增加可读性
      shadowRadius: 4,
      shadowDx: 1,
      shadowDy: 1,
      shadowColor: '#000000',
      textBackgroundStyle: {
        paddingX: 8,
        paddingY: 4,
        color: '#00000066',   // 半透明黑底
        type: 'stretchX',
      },
      position: 'bottomLeft',
    });

    // 第二次叠加：时间文字（在单号上方一行）
    const finalResult: string = await ImageMarker.markText({
      src: line1Result.startsWith('file://') ? line1Result.slice(7) : line1Result,
      text: `扫描时间: ${timeStr}`,
      color: '#FFE066',
      fontName: 'Arial',
      fontSize: 22,
      scale: 1,
      quality: 92,
      saveFormat: 'jpg',
      filename: `${safe}_${timestamp}`,
      shadowRadius: 3,
      shadowDx: 1,
      shadowDy: 1,
      shadowColor: '#000000',
      textBackgroundStyle: {
        paddingX: 8,
        paddingY: 4,
        color: '#00000066',
        type: 'stretchX',
      },
      position: 'bottomLeft',
      // Y 轴偏移，让时间行在单号行上方（约60px）
      Y: -100,
    });

    // 删除中间临时文件
    try {
      const tmpPath = line1Result.startsWith('file://') ? line1Result.slice(7) : line1Result;
      if (tmpPath !== srcPath) await RNFS.unlink(tmpPath);
    } catch {}

    // 返回 file:// 格式路径
    const result = finalResult.startsWith('file://') ? finalResult : `file://${finalResult}`;
    return result;
  } catch (e) {
    // 水印失败时降级：仅重命名文件（保留原图，以单号命名）
    return fallbackRename(photoUri, barcode, timestamp);
  }
}

/**
 * 降级方案：无法添加水印时，仅将文件以单号重命名复制
 */
async function fallbackRename(
  photoUri: string,
  barcode: string,
  timestamp: number,
): Promise<string> {
  try {
    const safe = safeFilename(barcode);
    const outDir = RNFS.CachesDirectoryPath;
    const destPath = `${outDir}/${safe}_${timestamp}.jpg`;
    const srcPath = photoUri.startsWith('file://') ? photoUri.slice(7) : photoUri;
    await RNFS.copyFile(srcPath, destPath);
    return `file://${destPath}`;
  } catch {
    return photoUri;
  }
}

/**
 * 从处理后的图片路径中提取上传用的文件名
 * 返回格式：单号_时间戳.jpg，如 SF123456789012_1710000000000.jpg
 */
export function getUploadFilename(barcode: string, timestamp: number): string {
  return `${safeFilename(barcode)}_${timestamp}.jpg`;
}
