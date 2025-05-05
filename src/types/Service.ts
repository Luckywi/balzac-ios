// src/types/Service.ts

// src/types/Service.ts

export interface ServiceSection {
  id: string;
  title: string; // Titre de la section, ex : "Coupes femmes"
}

export interface Service {
  id: string;
  title: string;
  description: string;
  duration: number; // Durée en minutes
  originalPrice: number; // Prix original
  discountedPrice?: number; // Prix après réduction (si applicable)
  discount?: number; // Pourcentage de réduction (-15, -30, -50)
  sectionId: string;
}

// Interface pour les formulaires d'édition/création
export interface ServiceFormData {
  title: string;
  description: string;
  duration: string; // Format HH:mm pour les formulaires
  originalPrice: string; // String pour les formulaires
  discount: string; // "-15", "-30", "-50" ou "" (aucune)
  sectionId?: string;
}