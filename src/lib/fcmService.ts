// fcmService.ts - Version améliorée avec Device ID
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function initFCM(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  
  console.log("Initialisation du service FCM...");
  
  try {
    // Obtenir l'identifiant unique de l'appareil
    const deviceInfo = await Device.getId();
    const deviceId = deviceInfo.identifier; // Identifiant stable pour l'appareil
    
    console.log("ID de l'appareil:", deviceId);
    
    // Délai pour s'assurer que tout est bien initialisé
    setTimeout(async () => {
      try {
        console.log("Demande des permissions de notification...");
        
        // Demander l'autorisation pour les notifications
        const { receive } = await FirebaseMessaging.requestPermissions();
        console.log("Statut de permission:", receive);
        
        // Vérifier si les permissions sont accordées
        if (receive === 'granted') {
          // Récupérer le token FCM
          try {
            console.log("Récupération du token FCM...");
            const { token } = await FirebaseMessaging.getToken();
            console.log("Token FCM obtenu:", token);
            
            if (token) {
              // Utiliser l'ID de l'appareil pour stocker le token
              await saveTokenToFirebase(deviceId, token);
            } else {
              console.error("Token FCM non disponible");
            }
          } catch (tokenError) {
            console.error("Erreur lors de la récupération du token:", tokenError);
          }
        } else {
          console.log("Permissions de notification refusées ou non disponibles");
        }
      } catch (permError) {
        console.error("Erreur lors de la demande de permissions:", permError);
      }
    }, 3000);
  } catch (deviceError) {
    console.error("Erreur lors de la récupération de l'ID de l'appareil:", deviceError);
  }
}

async function saveTokenToFirebase(deviceId: string, fcmToken: string): Promise<void> {
  try {
    console.log('Enregistrement du token pour l\'appareil:', deviceId);
    
    // Utiliser l'ID de l'appareil comme clé du document
    const tokenRef = doc(db, 'fcmTokens', deviceId);
    
    // Mettre à jour le document avec le nouveau token
    await setDoc(tokenRef, {
      token: fcmToken,
      lastUpdated: serverTimestamp(),
      platform: Capacitor.getPlatform()
    }, { merge: true }); // merge: true permet de mettre à jour le document s'il existe déjà
    
    console.log('Token FCM enregistré avec succès pour l\'appareil:', deviceId);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
  }
}