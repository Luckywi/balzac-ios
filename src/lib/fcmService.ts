import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { addDoc, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export interface FCMToken {
  token: string;
  deviceId: string;
  platform: string;
  createdAt: Date;
  lastUpdated: Date;
  appVersionInfo?: string;
}

// Fonction principale pour initialiser les notifications push
export async function initPushNotifications() {
  try {
    console.log('===== FCM TOKEN: Starting initialization process =====');
    
    // Si l'appareil n'est pas natif (ex: navigateur web), sortir
    if (!Capacitor.isNativePlatform()) {
      console.log('===== FCM TOKEN: Not a native platform, skipping push initialization =====');
      return;
    }
    
    // Attendre plus longtemps pour s'assurer que l'application est complètement chargée
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Vérifier d'abord l'état actuel des permissions - NE PAS demander de permission ici
    // Nous laisserons le code natif gérer la demande d'autorisation
    const currentPermissions = await PushNotifications.checkPermissions();
    console.log('===== FCM TOKEN: Current permission status:', currentPermissions.receive, '=====');
    
    // Si la permission est déjà accordée, procéder à l'enregistrement
    if (currentPermissions.receive === 'granted') {
      console.log('===== FCM TOKEN: Permission already granted, registering device... =====');
      
      // Ajouter les écouteurs avant d'enregistrer
      setupPushListeners();
      
      // Enregistrer l'appareil pour les notifications push
      await PushNotifications.register();
      console.log('===== FCM TOKEN: Device registered successfully =====');
    } 
    // Si les permissions ne sont pas accordées, informer l'utilisateur
    else if (currentPermissions.receive === 'denied') {
      console.log('===== FCM TOKEN: Notification permission is denied =====');
      logPermissionStatus('denied');
      console.log('===== FCM TOKEN: User should enable notifications in Settings > Le Balzac > Notifications =====');
    } 
    // Si l'état est "prompt", l'autorisation sera demandée par le code natif
    else {
      console.log('===== FCM TOKEN: Permission status is prompt, iOS native code will handle permission request =====');
      // Configurer quand même les listeners au cas où l'autorisation serait accordée plus tard
      setupPushListeners();
      // Appeler register de toute façon - il déclenchera la demande d'autorisation native
      await PushNotifications.register();
    }
  } catch (error) {
    console.error('===== FCM TOKEN: Error during initialization:', error, '=====');
  }
}

// Configurer les écouteurs pour les notifications push
function setupPushListeners() {
  // Suppression des écouteurs existants pour éviter les doublons
  PushNotifications.removeAllListeners();
  
  // Écouteur pour le token FCM
  PushNotifications.addListener('registration', async (token) => {
    console.log('===== FCM TOKEN: Received push registration token:', token.value, '=====');
    await saveFCMToken(token.value);
  });
  
  // Écouteur pour les erreurs d'enregistrement
  PushNotifications.addListener('registrationError', (error) => {
    console.error('===== FCM TOKEN: Registration error:', error, '=====');
  });
  
  // Écouteur pour les notifications reçues
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('===== FCM TOKEN: Push notification received:', notification, '=====');
  });
  
  // Écouteur pour les actions sur les notifications
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('===== FCM TOKEN: Push notification action performed:', notification, '=====');
  });
}

// Enregistrer le statut des permissions
async function logPermissionStatus(status: string) {
  try {
    const deviceId = await getUniqueDeviceId();
    console.log(`===== FCM TOKEN: Logging permission status ${status} for device ${deviceId} =====`);
    
    // Vous pourriez enregistrer cette information dans une collection dédiée
  } catch (error) {
    console.error('===== FCM TOKEN: Error logging permission status:', error, '=====');
  }
}

// Sauvegarder ou mettre à jour le token FCM dans Firestore
export async function saveFCMToken(token: string) {
  try {
    console.log('===== FCM TOKEN: Starting token save process =====');
    
    // Récupérer les informations de l'appareil
    const deviceInfo = await Device.getInfo();
    const deviceId = await getUniqueDeviceId();
    
    console.log('===== FCM TOKEN: Device info retrieved =====');
    console.log('===== FCM TOKEN: Device ID:', deviceId, '=====');
    console.log('===== FCM TOKEN: Platform:', deviceInfo.platform, '=====');
    console.log('===== FCM TOKEN: Model:', deviceInfo.model, '=====');
    
    // Vérifier si ce token existe déjà
    const q = query(
      collection(db, 'fcm_tokens'),
      where('deviceId', '==', deviceId)
    );
    
    console.log('===== FCM TOKEN: Checking if token exists in database =====');
    const querySnapshot = await getDocs(q);
    
    // Date actuelle
    const now = new Date();
    
    // Récupérer les informations de version de l'appareil
    const versionInfo = `${deviceInfo.platform} ${deviceInfo.osVersion} (${deviceInfo.model})`;
    
    // Si le token n'existe pas, l'ajouter
    if (querySnapshot.empty) {
      console.log('===== FCM TOKEN: No existing token found, creating new record =====');
      
      const tokenData: FCMToken = {
        token,
        deviceId,
        platform: deviceInfo.platform,
        createdAt: now,
        lastUpdated: now,
        appVersionInfo: versionInfo
      };
      
      await addDoc(collection(db, 'fcm_tokens'), tokenData);
      console.log('===== FCM TOKEN: New token saved successfully to Firestore =====');
    } else {
      // Si le token existe déjà, vérifier s'il a changé
      const docSnapshot = querySnapshot.docs[0];
      const existingData = docSnapshot.data() as FCMToken;
      
      if (existingData.token !== token) {
        console.log('===== FCM TOKEN: Token has changed, updating record =====');
        
        // Mettre à jour le token existant
        await updateDoc(doc(db, 'fcm_tokens', docSnapshot.id), {
          token: token,
          lastUpdated: now,
          appVersionInfo: versionInfo
        });
        
        console.log('===== FCM TOKEN: Token updated successfully =====');
      } else {
        console.log('===== FCM TOKEN: Token unchanged, no update needed =====');
      }
    }
  } catch (error) {
    console.error('===== FCM TOKEN: Error saving token:', error, '=====');
  }
}

// Fonction pour obtenir un ID unique pour l'appareil
async function getUniqueDeviceId(): Promise<string> {
  try {
    const info = await Device.getId();
    console.log('===== FCM TOKEN: Got device identifier:', info.identifier, '=====');
    return info.identifier;
  } catch (error) {
    console.error('===== FCM TOKEN: Error getting device ID:', error, '=====');
    
    // Fallback si l'identifiant ne peut pas être récupéré
    console.log('===== FCM TOKEN: Using fallback device identification method =====');
    const deviceInfo = await Device.getInfo();
    return `${deviceInfo.platform}_${deviceInfo.model}_${deviceInfo.operatingSystem}`;
  }
}

// Fonction pour vérifier régulièrement le statut des permissions
export async function monitorPermissionStatus() {
  try {
    const checkStatus = async () => {
      const status = await PushNotifications.checkPermissions();
      console.log('===== FCM TOKEN: Current permission status (monitor):', status.receive, '=====');
      
      if (status.receive === 'granted') {
        // Si l'autorisation a été accordée entre-temps, initialiser les notifications
        setupPushListeners();
        await PushNotifications.register();
      }
    };
    
    // Vérifier immédiatement
    await checkStatus();
    
    // Puis vérifier toutes les 10 secondes pendant 1 minute (pour détecter les changements manuels)
    let count = 0;
    const intervalId = setInterval(async () => {
      count++;
      await checkStatus();
      if (count >= 6) {  // 6 x 10 secondes = 1 minute
        clearInterval(intervalId);
      }
    }, 10000);
  } catch (error) {
    console.error('===== FCM TOKEN: Error monitoring permission status:', error, '=====');
  }
}

// Fonction alternative pour réessayer l'enregistrement des notifications
export async function retryPushRegistration() {
  try {
    console.log('===== FCM TOKEN: Retrying push registration =====');
    
    // Vérifier les permissions actuelles
    const permissionStatus = await PushNotifications.checkPermissions();
    console.log('===== FCM TOKEN: Current permission status for retry:', permissionStatus.receive, '=====');
    
    if (permissionStatus.receive === 'granted') {
      // Si les permissions sont accordées, configurer les écouteurs et enregistrer
      setupPushListeners();
      await PushNotifications.register();
      console.log('===== FCM TOKEN: Retry registration successful =====');
      return true;
    } else if (permissionStatus.receive === 'prompt') {
      // Si l'état est "prompt", essayer de demander à nouveau l'autorisation via le code natif
      console.log('===== FCM TOKEN: Permission status is prompt, attempting to request via native code =====');
      setupPushListeners();
      await PushNotifications.register();
      
      // Vérifier si l'autorisation a été accordée après la demande
      const newStatus = await PushNotifications.checkPermissions();
      return newStatus.receive === 'granted';
    } else {
      console.log('===== FCM TOKEN: Permissions denied, cannot retry registration =====');
      return false;
    }
  } catch (error) {
    console.error('===== FCM TOKEN: Error in retry registration:', error, '=====');
    return false;
  }
}