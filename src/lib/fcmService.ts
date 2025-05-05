// fcmService.ts - Version corrigée avec les bons types
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export function initFCM(): void {
  if (Capacitor.getPlatform() !== 'ios') return;
  
  console.log("Initialisation du service FCM...");
  
  // Ajouter un délai de 3 secondes
  setTimeout(async () => {
    try {
      console.log("Demande des permissions de notification...");
      
      // Demander l'autorisation pour les notifications
      const { receive } = await FirebaseMessaging.requestPermissions();
      console.log("Statut de permission:", receive);
      
      // Vérifier si les permissions sont accordées (seulement 'granted' est valide)
      if (receive === 'granted') {
        // Récupérer directement le token FCM
        try {
          console.log("Récupération du token FCM...");
          const { token } = await FirebaseMessaging.getToken();
          console.log("Token FCM obtenu:", token);
          
          if (token) {
            // Enregistrer le token dans Firebase
            saveTokenToFirebase(token);
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
}

async function saveTokenToFirebase(fcmToken: string): Promise<void> {
  try {
    console.log('Enregistrement du token dans Firebase:', fcmToken);
    
    await addDoc(collection(db, 'fcmTokens'), {
      token: fcmToken
    });
    
    console.log('Token FCM enregistré avec succès dans Firebase!');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
  }
}