import type { SMEDomainConfig } from './base';

export const swiftSMEConfig: SMEDomainConfig = {
	domain: 'swift',
	description:
		'Swift and Apple platform development (SwiftUI, UIKit, Xcode)',
	guidance: `- Swift language: protocols, generics, concurrency (async/await, actors)
- SwiftUI: views, modifiers, state management (@State, @Binding, @Observable)
- UIKit: view controllers, Auto Layout, lifecycle
- Combine: publishers, subscribers, operators
- SPM: package management, module structure, Package.swift
- Xcode: build settings, schemes, targets, signing
- Core Data, CloudKit, Keychain Services
- App architecture: MVVM, TCA, Clean Architecture
- macOS/iOS/watchOS/visionOS platform differences
- Testing: XCTest, Swift Testing framework`,
};
