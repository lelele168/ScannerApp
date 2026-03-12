import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useApp} from '../context/AppContext';
import {ValidationRule, DuplicateWindow} from '../types';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {settings, lang, updateSettings, setWifiStatus} = useApp();
  const {wifiConfig, validationRules, language} = settings;

  const [ip, setIp] = useState(wifiConfig.ip);
  const [port, setPort] = useState(String(wifiConfig.port));
  const [suffix, setSuffix] = useState(wifiConfig.suffix);
  const [cooldown, setCooldown] = useState(String(settings.cooldownMs));

  // 云存储配置本地状态
  const [cloudUrl, setCloudUrl] = useState(settings.cloudConfig.uploadUrl);
  const [cloudToken, setCloudToken] = useState(settings.cloudConfig.token);
  const [cloudField, setCloudField] = useState(settings.cloudConfig.fieldName || 'file');
  const [cloudExtra, setCloudExtra] = useState(settings.cloudConfig.extraParams || '');

  const saveWifi = () => {
    const p = parseInt(port, 10);
    if (!ip.trim()) {
      Alert.alert('', lang.enterIP);
      return;
    }
    if (isNaN(p) || p < 1 || p > 65535) {
      Alert.alert('', lang.enterPort);
      return;
    }
    updateSettings({
      wifiConfig: {...wifiConfig, ip: ip.trim(), port: p, suffix},
    });
    Alert.alert('', '✓ Saved');
  };

  const testConnect = async () => {
    const p = parseInt(port, 10);
    if (!ip.trim() || isNaN(p)) {
      Alert.alert('', lang.enterIP);
      return;
    }
    setWifiStatus('connecting');
    try {
      const TcpSocket = require('react-native-tcp-socket');
      const ok = await new Promise<boolean>(resolve => {
        const client = TcpSocket.createConnection({host: ip.trim(), port: p}, () => {
          client.destroy();
          resolve(true);
        });
        client.on('error', () => resolve(false));
        client.setTimeout(3000, () => {
          client.destroy();
          resolve(false);
        });
      });
      setWifiStatus(ok ? 'connected' : 'disconnected');
      Alert.alert('', ok ? lang.connectOk : lang.connectFail);
    } catch {
      setWifiStatus('disconnected');
      Alert.alert('', lang.connectFail);
    }
  };

  const toggleRule = (id: string, enabled: boolean) => {
    const newRules = validationRules.map((r: ValidationRule) =>
      r.id === id ? {...r, enabled} : r,
    );
    updateSettings({validationRules: newRules});
  };

  const updateRulePattern = (id: string, pattern: string) => {
    const newRules = validationRules.map((r: ValidationRule) =>
      r.id === id ? {...r, pattern} : r,
    );
    updateSettings({validationRules: newRules});
  };

  const saveCooldown = () => {
    const ms = parseInt(cooldown, 10);
    if (!isNaN(ms) && ms >= 200) {
      updateSettings({cooldownMs: ms});
    }
  };

  const saveCloud = () => {
    if (!cloudUrl.trim()) {
      Alert.alert('', (lang as any).cloudEnterUrl);
      return;
    }
    updateSettings({
      cloudConfig: {
        ...settings.cloudConfig,
        uploadUrl: cloudUrl.trim(),
        token: cloudToken.trim(),
        fieldName: cloudField.trim() || 'file',
        extraParams: cloudExtra.trim(),
      },
    });
    Alert.alert('', '✓ Saved');
  };

  const testCloudUpload = async () => {
    if (!cloudUrl.trim()) {
      Alert.alert('', (lang as any).cloudEnterUrl);
      return;
    }
    try {
      // 发送一个空 FormData 测试连接
      const formData = new FormData();
      formData.append('test', '1');
      const headers: Record<string, string> = {};
      if (cloudToken.trim()) {
        headers['Authorization'] = `Bearer ${cloudToken.trim()}`;
      }
      const resp = await fetch(cloudUrl.trim(), {
        method: 'POST',
        headers,
        body: formData,
      });
      // 能收到响应即视为连通（200/400/401均说明服务器可达）
      if (resp.status < 500) {
        Alert.alert('', (lang as any).cloudUploadOk);
      } else {
        Alert.alert('', (lang as any).cloudUploadFail);
      }
    } catch {
      Alert.alert('', (lang as any).cloudUploadFail);
    }
  };

  // 重复检测时间窗口选项
  const WINDOW_OPTIONS: {value: DuplicateWindow; labelKey: string}[] = [
    {value: 0,          labelKey: 'dupOff'},
    {value: 43200000,   labelKey: 'dup12h'},
    {value: 86400000,   labelKey: 'dup24h'},
    {value: 172800000,  labelKey: 'dup48h'},
    {value: 604800000,  labelKey: 'dupWeek'},
    {value: 2592000000, labelKey: 'dupMonth'},
    {value: -1,         labelKey: 'dupForever'},
  ];

  const SectionHeader = ({title}: {title: string}) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const Row = ({
    label,
    value,
    onValueChange,
  }: {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
  }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{false: '#ccc', true: '#0D1117'}}
        thumbColor={value ? '#00E5FF' : '#fff'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← {lang.records}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang.settings}</Text>
        <View style={{width: 60}} />
      </View>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ─── 语言 ─── */}
          <SectionHeader title={lang.language} />
          <View style={styles.card}>
            <View style={styles.langRow}>
              {(['zh', 'en'] as const).map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.langBtn, language === l && styles.langBtnActive]}
                  onPress={() => updateSettings({language: l})}>
                  <Text style={[styles.langBtnText, language === l && styles.langBtnTextActive]}>
                    {l === 'zh' ? '中文' : 'English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ─── 声音震动 ─── */}
          <SectionHeader title={`${lang.sound} / ${lang.vibration}`} />
          <View style={styles.card}>
            <Row label={lang.sound} value={settings.soundEnabled} onValueChange={v => updateSettings({soundEnabled: v})} />
            <View style={styles.divider} />
            <Row label={lang.vibration} value={settings.vibrationEnabled} onValueChange={v => updateSettings({vibrationEnabled: v})} />
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{lang.cooldown}</Text>
              <TextInput
                style={styles.smallInput}
                value={cooldown}
                onChangeText={setCooldown}
                onBlur={saveCooldown}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* ─── 重复检测 ─── */}
          <SectionHeader title={lang.duplicateWindow} />
          <View style={styles.card}>
            {/* 总开关 */}
            <Row
              label={lang.duplicateCheck}
              value={settings.duplicateCheck}
              onValueChange={v => updateSettings({duplicateCheck: v})}
            />
            {settings.duplicateCheck && (
              <>
                <View style={styles.divider} />
                <Text style={styles.windowDesc}>{lang.duplicateWindowDesc}</Text>
                <View style={styles.windowGrid}>
                  {WINDOW_OPTIONS.map(opt => {
                    const isActive = settings.duplicateWindow === opt.value;
                    const isOff = opt.value === 0;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.windowBtn,
                          isActive && (isOff ? styles.windowBtnOff : styles.windowBtnActive),
                        ]}
                        onPress={() => updateSettings({duplicateWindow: opt.value})}>
                        <Text
                          style={[
                            styles.windowBtnText,
                            isActive && styles.windowBtnTextActive,
                          ]}>
                          {(lang as any)[opt.labelKey]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>

          {/* ─── WiFi 传输 ─── */}
          <SectionHeader title={lang.wifiConfig} />
          <View style={styles.card}>
            <Row
              label={lang.wifiEnabled}
              value={wifiConfig.enabled}
              onValueChange={v => updateSettings({wifiConfig: {...wifiConfig, enabled: v}})}
            />
            <View style={styles.divider} />
            <Row
              label={lang.autoUpload}
              value={settings.autoUpload}
              onValueChange={v => updateSettings({autoUpload: v})}
            />
            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>{lang.wifiIP}</Text>
            <TextInput
              style={styles.input}
              value={ip}
              onChangeText={setIp}
              placeholder="192.168.1.100"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>{lang.wifiPort}</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
              placeholder="8888"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>{lang.wifiSuffix} (\\n=换行 \\t=Tab)</Text>
            <TextInput
              style={styles.input}
              value={suffix}
              onChangeText={setSuffix}
              placeholder="\n"
              placeholderTextColor="#aaa"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.testBtn} onPress={testConnect}>
                <Text style={styles.testBtnText}>{lang.testConnect}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveWifi}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── 云存储 / 拍照上传 ─── */}
          <SectionHeader title={(lang as any).cloudConfig} />
          <View style={styles.card}>
            <Row
              label={(lang as any).photoEnabled}
              value={settings.photoEnabled}
              onValueChange={v => updateSettings({photoEnabled: v})}
            />
            <View style={styles.divider} />
            <Row
              label={(lang as any).cloudEnabled}
              value={settings.cloudConfig.enabled}
              onValueChange={v =>
                updateSettings({cloudConfig: {...settings.cloudConfig, enabled: v}})
              }
            />

            {settings.cloudConfig.enabled && (
              <>
                <View style={styles.divider} />

                <Text style={styles.fieldLabel}>{(lang as any).cloudUrl}</Text>
                <TextInput
                  style={styles.input}
                  value={cloudUrl}
                  onChangeText={setCloudUrl}
                  placeholder={(lang as any).cloudUrlPlaceholder}
                  placeholderTextColor="#aaa"
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="url"
                />

                <Text style={styles.fieldLabel}>{(lang as any).cloudToken}</Text>
                <TextInput
                  style={styles.input}
                  value={cloudToken}
                  onChangeText={setCloudToken}
                  placeholder="your-token-here"
                  placeholderTextColor="#aaa"
                  autoCorrect={false}
                  autoCapitalize="none"
                  secureTextEntry={false}
                />

                <Text style={styles.fieldLabel}>{(lang as any).cloudFieldName}</Text>
                <TextInput
                  style={styles.input}
                  value={cloudField}
                  onChangeText={setCloudField}
                  placeholder={(lang as any).cloudFieldPlaceholder}
                  placeholderTextColor="#aaa"
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>{(lang as any).cloudExtraParams}</Text>
                <TextInput
                  style={styles.input}
                  value={cloudExtra}
                  onChangeText={setCloudExtra}
                  placeholder={(lang as any).cloudExtraPlaceholder}
                  placeholderTextColor="#aaa"
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.testBtn} onPress={testCloudUpload}>
                    <Text style={styles.testBtnText}>{(lang as any).testCloudUpload}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveCloud}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* ─── 防呆验证规则 ─── */}
          <SectionHeader title={lang.validationRules} />
          <View style={styles.card}>
            {validationRules.map((rule: ValidationRule, idx: number) => (
              <View key={rule.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.ruleRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.ruleName}>
                      {language === 'zh' ? rule.name : rule.nameEn}
                    </Text>
                    {rule.enabled && rule.id !== 'courier' && (
                      <TextInput
                        style={styles.ruleInput}
                        value={rule.pattern}
                        onChangeText={text => updateRulePattern(rule.id, text)}
                        placeholder="正则表达式 / Regex"
                        placeholderTextColor="#aaa"
                        autoCorrect={false}
                        autoCapitalize="none"
                      />
                    )}
                    {rule.enabled && rule.id === 'courier' && (
                      <Text style={styles.ruleHint}>自动识别顺丰/京东/邮政/中通等</Text>
                    )}
                  </View>
                  <Switch
                    value={rule.enabled}
                    onValueChange={v => toggleRule(rule.id, v)}
                    trackColor={{false: '#ccc', true: '#0D1117'}}
                    thumbColor={rule.enabled ? '#00E5FF' : '#fff'}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={{height: 40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F0F2F5'},
  header: {
    backgroundColor: '#0D1117',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {color: '#00E5FF', fontSize: 14},
  headerTitle: {color: '#fff', fontSize: 17, fontWeight: '700'},

  scroll: {padding: 14},
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowLabel: {fontSize: 14, color: '#1a1a1a'},
  divider: {height: 1, backgroundColor: '#F0F0F0'},

  langRow: {flexDirection: 'row', gap: 10, paddingVertical: 12},
  langBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  langBtnActive: {borderColor: '#0D1117', backgroundColor: '#0D1117'},
  langBtnText: {fontSize: 14, color: '#666', fontWeight: '500'},
  langBtnTextActive: {color: '#fff', fontWeight: '700'},

  fieldLabel: {fontSize: 12, color: '#888', marginTop: 8, marginBottom: 4},
  input: {
    borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: '#333',
    marginBottom: 4,
  },
  smallInput: {
    borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 13, color: '#333', width: 80, textAlign: 'center',
  },
  btnRow: {flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 8},
  testBtn: {
    flex: 1, backgroundColor: '#F0F2F5',
    borderRadius: 8, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  testBtnText: {fontSize: 13, color: '#333', fontWeight: '600'},
  saveBtn: {
    flex: 1, backgroundColor: '#0D1117',
    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  saveBtnText: {color: '#fff', fontSize: 13, fontWeight: '700'},

  ruleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, gap: 10,
  },
  ruleName: {fontSize: 14, color: '#1a1a1a', marginBottom: 4},
  ruleInput: {
    borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 12, color: '#333', marginTop: 4,
  },
  ruleHint: {fontSize: 11, color: '#888', marginTop: 2},

  // 重复检测时间窗口
  windowDesc: {
    fontSize: 12, color: '#888',
    paddingTop: 8, paddingBottom: 10,
    lineHeight: 18,
  },
  windowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 14,
  },
  windowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#F7F7F7',
  },
  windowBtnActive: {
    borderColor: '#0D1117',
    backgroundColor: '#0D1117',
  },
  windowBtnOff: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
  },
  windowBtnText: {fontSize: 13, color: '#555', fontWeight: '500'},
  windowBtnTextActive: {color: '#fff', fontWeight: '700'},
});

export default SettingsScreen;
