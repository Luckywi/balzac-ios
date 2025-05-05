import UIKit
import Capacitor
import Firebase
import FirebaseMessaging    // ← nécessaire

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
      _ application: UIApplication,
      didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        FirebaseApp.configure()
        
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self            // ← important
        application.registerForRemoteNotifications()
        
        return true  // ou CAPBridgeAppDelegateProxy.shared.application(...)
    }

    func application(
      _ application: UIApplication,
      didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(
      _ application: UIApplication,
      didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("Échec registration remote notifications:", error.localizedDescription)
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
      _ center: UNUserNotificationCenter,
      willPresent notification: UNNotification,
      withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.alert, .badge, .sound])
    }

    func userNotificationCenter(
      _ center: UNUserNotificationCenter,
      didReceive response: UNNotificationResponse,
      withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        completionHandler()
    }
}

extension AppDelegate: MessagingDelegate {
    func messaging(
      _ messaging: Messaging,
      didReceiveRegistrationToken fcmToken: String?
    ) {
        print("FCM token:", fcmToken ?? "aucun")
        // Envoie à ton serveur / Firestore si besoin
    }
}