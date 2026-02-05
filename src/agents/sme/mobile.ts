import type { SMEDomainConfig } from './base';

export const mobileSMEConfig: SMEDomainConfig = {
	domain: 'mobile',
	description:
		'Mobile development (React Native, Module Federation, Expo, iOS, Android)',
	guidance: `- React Native: components, navigation (React Navigation 7.x), native modules
- Module Federation: micro-frontend architecture, remote/host apps, shared dependencies
- Expo: managed workflow, EAS Build, config plugins
- MMKV/SQLite storage patterns (warm/cold/secure)
- Deep linking, push notifications, app lifecycle
- Platform-specific code (.ios.ts, .android.ts)
- Performance: FlatList, memo, native driver animations, Hermes
- Metro bundler, babel config, native module linking
- OTA updates, app store deployment, code signing`,
};
