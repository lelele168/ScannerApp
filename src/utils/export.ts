import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {ScanRecord} from '../../types';
import {formatTime} from '../index';

const HEADERS_ZH = ['序号', '扫码内容', '码类型', '来源', '快递公司', '验证', '已同步', '扫描时间'];
const HEADERS_EN = ['No.', 'Value', 'Type', 'Source', 'Courier', 'Valid', 'Synced', 'Time'];

function buildCSVRow(cells: string[]): string {
  return cells.map(c => `"${c.replace(/"/g, '""')}"`).join(',');
}

function recordToRow(r: ScanRecord, idx: number, language: 'zh' | 'en'): string[] {
  return [
    String(idx + 1),
    r.value,
    r.type,
    r.source === 'ocr' ? 'OCR' : language === 'zh' ? '扫码' : 'Scan',
    r.courier ? (language === 'zh' ? r.courier.company : r.courier.companyEn) : '',
    r.validated ? (language === 'zh' ? '通过' : 'Pass') : (language === 'zh' ? '未通过' : 'Fail'),
    r.synced ? (language === 'zh' ? '是' : 'Yes') : (language === 'zh' ? '否' : 'No'),
    formatTime(r.timestamp),
  ];
}

export async function exportCSV(records: ScanRecord[], language: 'zh' | 'en' = 'zh'): Promise<boolean> {
  try {
    const headers = language === 'zh' ? HEADERS_ZH : HEADERS_EN;
    const rows = [
      buildCSVRow(headers),
      ...records.map((r, i) => buildCSVRow(recordToRow(r, i, language))),
    ];
    const content = '\uFEFF' + rows.join('\r\n'); // BOM for Excel
    const fileName = `scan_records_${Date.now()}.csv`;
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(filePath, content, 'utf8');
    await Share.open({
      url: `file://${filePath}`,
      type: 'text/csv',
      filename: fileName,
    });
    return true;
  } catch {
    return false;
  }
}

export async function exportExcel(records: ScanRecord[], language: 'zh' | 'en' = 'zh'): Promise<boolean> {
  try {
    const XLSX = require('xlsx');
    const headers = language === 'zh' ? HEADERS_ZH : HEADERS_EN;
    const data = [headers, ...records.map((r, i) => recordToRow(r, i, language))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, language === 'zh' ? '扫码记录' : 'Scan Records');

    // 列宽
    ws['!cols'] = [
      {wch: 5}, {wch: 36}, {wch: 14}, {wch: 8},
      {wch: 12}, {wch: 8}, {wch: 8}, {wch: 20},
    ];

    const wbout: string = XLSX.write(wb, {type: 'base64', bookType: 'xlsx'});
    const fileName = `scan_records_${Date.now()}.xlsx`;
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(filePath, wbout, 'base64');
    await Share.open({
      url: `file://${filePath}`,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: fileName,
    });
    return true;
  } catch {
    return false;
  }
}
