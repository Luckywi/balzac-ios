import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();

interface Rdv {
  clientName: string;
  clientPhone?: string;
  serviceTitle: string;
  serviceDuration: number;
  staffId: string;
  start: string;
  end: string;
  price: number;
  source: string;
  paid?: boolean;
  paymentStatus?: string;
  paymentIntentId?: string;
}

interface TokenResult {
  success: boolean;
  token: string;
  remove?: boolean;
}

export const sendRdvNotification = onDocumentCreated('rdvs/{rdvId}', async (event) => {
  // 1. Récupérer les données du rendez-vous
  const rdvData = event.data?.data() as Rdv | undefined;
  if (!rdvData) {
    console.log('Pas de données trouvées pour ce rendez-vous');
    return null;
  }
  
  // Formatage de la date et heure pour l'affichage
  const startDate = new Date(rdvData.start);
  const dateStr = startDate.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const timeStr = startDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // 2. Créer le message de notification
  const notificationTitle = 'Nouveau rendez-vous';
  const notificationBody = `Rendez-vous le ${dateStr} à ${timeStr} pour ${rdvData.serviceTitle}`;
  
  // 3. Récupérer tous les tokens FCM
  const tokensSnapshot = await admin.firestore().collection('fcmTokens').get();
  const tokens: string[] = [];
  
  tokensSnapshot.forEach(doc => {
    const token = doc.data().token;
    if (token) {
      tokens.push(token);
    }
  });
  
  // 4. Configurer le message pour iOS
  const message = {
    notification: {
      title: notificationTitle,
      body: notificationBody,
    },
    // Configuration spécifique à iOS (APNS)
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
          'content-available': 1,
        },
      },
    },
  };
  
  // 5. Envoyer à tous les appareils
  if (tokens.length > 0) {
    console.log(`Envoi de notification à ${tokens.length} appareils`);
    const messaging = admin.messaging();
    
    // Créer un tableau de promesses pour tous les envois
    const sendPromises = tokens.map(token => {
      // Créer une copie du message et définir le token
      const tokenMessage = {
        ...message,
        token: token  // Chaque message doit avoir un token spécifique
      };
      
      // Envoyer au token
      return messaging.send(tokenMessage)
        .then(response => {
          console.log('Message envoyé avec succès:', response);
          return { success: true, token } as TokenResult;
        })
        .catch(error => {
          console.error('Erreur d\'envoi au token:', token, error);
          // Vérifier si le token est invalide
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            return { success: false, token, remove: true } as TokenResult;
          }
          return { success: false, token, remove: false } as TokenResult;
        });
    });
    
    // Attendre que tous les envois soient terminés
    return Promise.all(sendPromises)
      .then(results => {
        // Identifier les tokens à supprimer
        const tokensToRemove = results
          .filter(result => result.success === false && result.remove === true)
          .map(result => result.token);
        
        if (tokensToRemove.length > 0) {
          console.log(`Suppression de ${tokensToRemove.length} tokens invalides`);
          // Supprimer les tokens invalides
          const removePromises = tokensToRemove.map(token => {
            return admin.firestore().collection('fcmTokens')
              .where('token', '==', token).get()
              .then(snapshot => {
                const batch = admin.firestore().batch();
                snapshot.forEach(doc => {
                  batch.delete(doc.ref);
                });
                return batch.commit();
              });
          });
          
          return Promise.all(removePromises);
        }
        
        return null;
      });
  } else {
    console.log('Aucun token trouvé pour envoyer des notifications');
    return null;
  }
});