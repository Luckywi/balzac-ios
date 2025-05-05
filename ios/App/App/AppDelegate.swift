import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?
    private var tokenSyncedWithJS = false
    private var isRequestingAuthorization = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialiser Firebase - assurez-vous que Firebase est bien configuré
        FirebaseApp.configure()
        
        print("=======================================")
        print("App Delegate: Application launched")
        print("=======================================")
        
        // Configuration pour les notifications
        UNUserNotificationCenter.current().delegate = self
        
        // Configurer Messaging delegate
        Messaging.messaging().delegate = self
        
        // Demander explicitement l'autorisation pour les notifications - IMPORTANT
        requestNotificationAuthorization { granted in
            print("=======================================")
            print("Initial notification authorization request result: \(granted)")
            print("=======================================")
            
            if granted {
                // Si l'autorisation est accordée, enregistrer pour les notifications distantes
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }
        
        // Vérifier le statut actuel des autorisations pour le déboggage
        checkNotificationSettings()
        
        return true
    }
    
    // Méthode explicite pour demander l'autorisation des notifications
    func requestNotificationAuthorization(completion: @escaping (Bool) -> Void) {
        // Éviter les demandes multiples
        guard !isRequestingAuthorization else {
            print("Already requesting authorization")
            completion(false)
            return
        }
        
        isRequestingAuthorization = true
        
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
            self.isRequestingAuthorization = false
            
            print("=======================================")
            print("Notification authorization request result: \(granted)")
            if let error = error {
                print("Authorization error: \(error.localizedDescription)")
            }
            print("=======================================")
            
            completion(granted)
        }
    }
    
    // Vérifier et afficher les paramètres de notification actuels
    func checkNotificationSettings() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            print("=======================================")
            print("Current notification settings:")
            print("Authorization status: \(self.authStatusToString(settings.authorizationStatus))")
            print("Alert setting: \(self.settingToString(settings.alertSetting))")
            print("Badge setting: \(self.settingToString(settings.badgeSetting))")
            print("Sound setting: \(self.settingToString(settings.soundSetting))")
            print("Notification center setting: \(self.settingToString(settings.notificationCenterSetting))")
            print("Lock screen setting: \(self.settingToString(settings.lockScreenSetting))")
            print("=======================================")
        }
    }
    
    // Convertir les statuts d'autorisation en chaînes lisibles
    func authStatusToString(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .denied: return "denied"
        case .authorized: return "authorized"
        case .provisional: return "provisional"
        case .ephemeral: return "ephemeral"
        @unknown default: return "unknown"
        }
    }
    
    // Convertir les paramètres en chaînes lisibles
    func settingToString(_ setting: UNNotificationSetting) -> String {
        switch setting {
        case .notSupported: return "notSupported"
        case .disabled: return "disabled"
        case .enabled: return "enabled"
        @unknown default: return "unknown"
        }
    }

    // Fonction appelée lorsque le token FCM est généré
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        print("=======================================")
        print("FCM TOKEN RECEIVED IN NATIVE CODE: \(String(describing: fcmToken))")
        print("=======================================")
        
        guard let token = fcmToken, !tokenSyncedWithJS else {
            print("Token is nil or already synced with JS")
            return
        }
        
        // Envoyer le token au code JavaScript via une notification
        NotificationCenter.default.post(
            name: Notification.Name("FCMTokenReceived"),
            object: nil,
            userInfo: ["token": token]
        )
        
        // Marquer le token comme synchronisé
        tokenSyncedWithJS = true
        
        // Envoyer directement le token à votre code JS via le bridge Capacitor
        notifyTokenToJS(token: token)
    }
    
    // Méthode pour notifier le token au JS via le bridge Capacitor
    func notifyTokenToJS(token: String) {
        if let bridgeViewController = window?.rootViewController as? CAPBridgeViewController {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                print("=======================================")
                print("Sending FCM token to JS via bridge: \(token)")
                print("=======================================")
                
                let jsonString = """
                {
                    "value": "\(token)"
                }
                """
                
                bridgeViewController.bridge?.eval(js: """
                if (window.capacitorExports && window.capacitorExports.PushNotifications) {
                    window.capacitorExports.PushNotifications.notifyListeners('registration', \(jsonString));
                    console.log('FCM TOKEN sent from native to JS bridge:', '\(token)');
                } else {
                    console.error('Capacitor PushNotifications plugin not found');
                }
                """)
            }
        } else {
            print("=======================================")
            print("Could not find Capacitor bridge view controller")
            print("=======================================")
        }
    }
    
    // Gestion des notifications reçues en avant-plan
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("=======================================")
        print("Notification received in foreground")
        print("Notification content: \(notification.request.content.userInfo)")
        print("=======================================")
        
        // Afficher la notification même si l'app est au premier plan
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .badge, .sound])
        } else {
            completionHandler([.alert, .badge, .sound])
        }
    }
    
    // Gestion des actions sur les notifications
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("=======================================")
        print("Notification action performed")
        print("Action: \(response.actionIdentifier)")
        print("User info: \(userInfo)")
        print("=======================================")
        
        // Transmettre cette notification au plugin Capacitor
        if let bridgeViewController = window?.rootViewController as? CAPBridgeViewController {
            let jsonData = try? JSONSerialization.data(withJSONObject: userInfo, options: [])
            if let jsonString = jsonData.flatMap({ String(data: $0, encoding: .utf8) }) {
                bridgeViewController.bridge?.eval(js: """
                if (window.capacitorExports && window.capacitorExports.PushNotifications) {
                    window.capacitorExports.PushNotifications.notifyListeners('pushNotificationActionPerformed', {
                        actionId: '\(response.actionIdentifier)',
                        notification: { data: \(jsonString) }
                    });
                }
                """)
            }
        }
        
        completionHandler()
    }

    // Fonction appelée lorsqu'un token d'enregistrement des notifications à distance est reçu
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Passer le token à Firebase Messaging
        Messaging.messaging().apnsToken = deviceToken
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("=======================================")
        print("APNs token registered: \(tokenString)")
        print("=======================================")
        
        // Vérifier à nouveau les autorisations pour confirmer qu'elles sont bien accordées
        checkNotificationSettings()
    }
    
    // Fonction appelée en cas d'échec d'enregistrement pour les notifications
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("=======================================")
        print("Failed to register for remote notifications: \(error.localizedDescription)")
        print("=======================================")
        
        // Tenter de diagnostiquer le problème
        if let bridgeViewController = window?.rootViewController as? CAPBridgeViewController {
            bridgeViewController.bridge?.eval(js: """
            console.error('Native side failed to register for remote notifications: \(error.localizedDescription.replacingOccurrences(of: "'", with: "\\'"))');
            """)
        }
        
        // Vérifier les paramètres de notification pour aider au débogage
        checkNotificationSettings()
    }
    
    // Relayer les messages FCM au code JavaScript
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable : Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("=======================================")
        print("Remote notification received: \(userInfo)")
        print("=======================================")
        
        // Relayer au code JavaScript (pour les notifications en arrière-plan)
        if let bridgeViewController = window?.rootViewController as? CAPBridgeViewController {
            let jsonData = try? JSONSerialization.data(withJSONObject: userInfo, options: [])
            if let jsonString = jsonData.flatMap({ String(data: $0, encoding: .utf8) }) {
                bridgeViewController.bridge?.eval(js: """
                if (window.capacitorExports && window.capacitorExports.PushNotifications) {
                    window.capacitorExports.PushNotifications.notifyListeners('pushNotificationReceived', { data: \(jsonString) });
                }
                """)
            }
        }
        
        completionHandler(.newData)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources and store application state.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
        
        // Vérifier l'état des autorisations pour les notifications à chaque retour au premier plan
        checkNotificationSettings()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused while the application was inactive.
        
        // Effacer les badges
        application.applicationIconBadgeNumber = 0
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url.
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity.
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
