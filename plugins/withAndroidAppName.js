// Android 표시명(app_name)을 한글로 오버라이드 — expo.name은 iOS Xcode 타겟명 때문에 ASCII 유지 필요
const { withStringsXml, AndroidConfig } = require('expo/config-plugins');

module.exports = (config, name) => withStringsXml(config, (c) => {
  c.modResults = AndroidConfig.Strings.setStringItem(
    [{ $: { name: 'app_name', translatable: 'false' }, _: name }],
    c.modResults,
  );
  return c;
});
