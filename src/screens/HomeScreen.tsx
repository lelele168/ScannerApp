import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useNavigation} from '@react-navigation/native';
import {useApp} from '../context/AppContext';
import {ScanRecord} from '../types';
import {formatTime} from '../utils';
import {exportExcel, exportCSV} from '../utils/export';

const RecordItem: React.FC<{
  item: ScanRecord;
  onDelete: () => void;
  language: 'zh' | 'en';
  lang: any;
  photoEnabled: boolean;
}> = ({item, onDelete, language, lang, photoEnabled}) => {
  const [copied, setCopied] = useState(false);

  return (
    <View style={[styles.card, !item.validated && styles.cardInvalid]}>
      {/* 左侧色条：快递公司颜色 */}
      {item.courier && (
        <View style={[styles.courierStripe, {backgroundColor: item.courier.color}]} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.typeTag}>{item.type}</Text>
          {item.courier && (
            <Text style={[styles.courierTag, {color: item.courier.color}]}>
              {language === 'zh' ? item.courier.company : item.courier.companyEn}
            </Text>
          )}
          {item.source === 'ocr' && <Text style={styles.ocrTag}>OCR</Text>}
          <View style={[styles.syncDot, {backgroundColor: item.synced ? '#34C759' : '#FF9500'}]} />
          {/* 照片上传状态 */}
          {photoEnabled && item.photoUri && (
            <View style={[
              styles.photoTag,
              item.photoUploaded ? styles.photoTagUploaded : styles.photoTagPending,
            ]}>
              <Text style={styles.photoTagText}>
                {item.photoUploaded
                  ? `📷 ${lang.photoUploaded ?? '已上传'}`
                  : `📷 ${lang.photoPending ?? '待上传'}`}
              </Text>
            </View>
          )}
          {!item.validated && item.validationMsg ? (
            <Text style={styles.failTag}>✗ {item.validationMsg}</Text>
          ) : null}
        </View>
        <Text style={styles.valueText} numberOfLines={2} selectable>
          {item.value}
        </Text>
        <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, copied && styles.actionBtnActive]}
          onPress={() => {
            Clipboard.setString(item.value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}>
          <Text style={[styles.actionText, copied && styles.actionTextActive]}>
            {copied ? lang.copied : lang.copy}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.delBtn]} onPress={onDelete}>
          <Text style={styles.delText}>{lang.delete}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const {records, settings, lang, offlineQueue, deleteRecord, clearAll, uploadOfflineQueue, wifiStatus} = useApp();
  const [search, setSearch] = useState('');

  const filtered = search
    ? records.filter(r => r.value.toLowerCase().includes(search.toLowerCase()))
    : records;

  const syncedCount = records.filter(r => r.synced).length;

  const handleClearAll = () => {
    if (!records.length) return;
    Alert.alert(lang.confirmClear, lang.confirmClearMsg, [
      {text: lang.cancel, style: 'cancel'},
      {text: lang.confirm, style: 'destructive', onPress: clearAll},
    ]);
  };

  const handleExport = (type: 'excel' | 'csv') => {
    if (!records.length) {
      Alert.alert('', lang.noData);
      return;
    }
    const fn = type === 'excel' ? exportExcel : exportCSV;
    fn(records, settings.language).then(ok => {
      Alert.alert('', ok ? lang.exportSuccess : lang.uploadFail);
    });
  };

  const wifiDotColor =
    wifiStatus === 'connected' ? '#4CD964' : wifiStatus === 'connecting' ? '#FFD60A' : '#8E8E93';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* 标题栏 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{lang.appName}</Text>
          <Text style={styles.headerSub}>{records.length} {lang.items || ''} {lang.total}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.wifiIndicator, {backgroundColor: wifiDotColor + '33'}]}>
            <View style={[styles.wifiDot, {backgroundColor: wifiDotColor}]} />
            <Text style={[styles.wifiText, {color: wifiDotColor}]}>
              {lang[wifiStatus] ?? lang.disconnected}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 统计栏 */}
      <View style={styles.statsRow}>
        {[
          {num: records.length, label: lang.total},
          {num: new Set(records.map(r => r.value)).size, label: lang.unique},
          {num: syncedCount, label: lang.synced},
          {num: offlineQueue.length, label: lang.unsynced},
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statNum}>{s.num}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* 离线队列提示 */}
      {offlineQueue.length > 0 && (
        <TouchableOpacity style={styles.offlineBanner} onPress={uploadOfflineQueue}>
          <Text style={styles.offlineBannerText}>
            📤 {lang.offlineCount}: {offlineQueue.length} — {lang.uploadAll}
          </Text>
        </TouchableOpacity>
      )}

      {/* 搜索 + 操作 */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={lang.searchPlaceholder}
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.toolBtn} onPress={() => handleExport('excel')}>
          <Text style={styles.toolBtnText}>XLS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => handleExport('csv')}>
          <Text style={styles.toolBtnText}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, styles.toolBtnDanger]} onPress={handleClearAll}>
          <Text style={styles.toolBtnText}>{lang.clearAll}</Text>
        </TouchableOpacity>
      </View>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>{lang.noRecords}</Text>
          <Text style={styles.emptyTip}>{lang.tapToScan}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <RecordItem
              item={item}
              onDelete={() => deleteRecord(item.id)}
              language={settings.language}
              lang={lang}
              photoEnabled={settings.photoEnabled}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 扫码FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Scanner')}
        activeOpacity={0.85}>
        <Text style={styles.fabIcon}>⊙</Text>
        <Text style={styles.fabText}>{lang.startScan}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F0F2F5'},

  header: {
    backgroundColor: '#0D1117',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {color: '#fff', fontSize: 20, fontWeight: '700'},
  headerSub: {color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2},
  headerRight: {flexDirection: 'row', alignItems: 'center', gap: 10},
  wifiIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
  },
  wifiDot: {width: 7, height: 7, borderRadius: 3.5},
  wifiText: {fontSize: 11, fontWeight: '600'},
  settingsBtn: {
    width: 34, height: 34,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 17,
  },
  settingsBtnText: {fontSize: 16},

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    elevation: 2, shadowColor: '#000',
    shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 3,
  },
  statNum: {fontSize: 20, fontWeight: '700', color: '#0D1117'},
  statLabel: {fontSize: 10, color: '#888', marginTop: 2},

  offlineBanner: {
    backgroundColor: '#FF9500',
    marginHorizontal: 12,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  offlineBannerText: {color: '#fff', fontSize: 13, fontWeight: '600'},

  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 10, height: 36,
    elevation: 1,
  },
  searchIcon: {fontSize: 13, marginRight: 4},
  searchInput: {flex: 1, fontSize: 13, color: '#333'},
  clearIcon: {color: '#999', fontSize: 15, paddingLeft: 4},
  toolBtn: {
    backgroundColor: '#0D1117',
    borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8,
  },
  toolBtnDanger: {backgroundColor: '#FF3B30'},
  toolBtnText: {color: '#fff', fontSize: 12, fontWeight: '600'},

  listContent: {paddingHorizontal: 12, paddingBottom: 100},
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  cardInvalid: {borderWidth: 1, borderColor: '#FF3B30'},
  courierStripe: {width: 4},
  cardBody: {flex: 1, padding: 12},
  cardTopRow: {flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap'},
  typeTag: {
    fontSize: 10, color: '#fff',
    backgroundColor: '#0D1117',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  courierTag: {fontSize: 11, fontWeight: '700'},
  ocrTag: {
    fontSize: 10, color: '#fff',
    backgroundColor: '#8E44AD',
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  syncDot: {width: 7, height: 7, borderRadius: 3.5},
  failTag: {fontSize: 10, color: '#FF3B30'},
  photoTag: {
    paddingHorizontal: 5, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  photoTagUploaded: {backgroundColor: '#E3F8EA'},
  photoTagPending: {backgroundColor: '#FFF3E0'},
  photoTagText: {fontSize: 9, fontWeight: '600', color: '#555'},
  valueText: {fontSize: 14, color: '#1a1a1a', lineHeight: 20},
  timeText: {fontSize: 11, color: '#aaa', marginTop: 4},
  cardActions: {justifyContent: 'center', padding: 10, gap: 6},
  actionBtn: {
    borderWidth: 1, borderColor: '#0D1117',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
  },
  actionBtnActive: {backgroundColor: '#0D1117'},
  actionText: {fontSize: 11, color: '#0D1117'},
  actionTextActive: {color: '#fff'},
  delBtn: {borderColor: '#FF3B30'},
  delText: {fontSize: 11, color: '#FF3B30'},

  empty: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80},
  emptyIcon: {fontSize: 52, marginBottom: 12},
  emptyTitle: {fontSize: 16, color: '#666', fontWeight: '500'},
  emptyTip: {fontSize: 13, color: '#aaa', marginTop: 6},

  fab: {
    position: 'absolute', bottom: 24, alignSelf: 'center',
    backgroundColor: '#0D1117',
    borderRadius: 30, paddingHorizontal: 36, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    elevation: 8,
    shadowColor: '#0D1117',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4, shadowRadius: 12,
  },
  fabIcon: {fontSize: 20, color: '#00E5FF'},
  fabText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});

export default HomeScreen;
