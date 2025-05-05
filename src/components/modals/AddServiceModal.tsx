import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ServiceData {
  title: string;
  description: string;
  duration: string; // format HH:mm
  originalPrice: string;
  discount: string; // "-15", "-30", "-50" ou "" (aucune)
}

interface AddServiceModalProps {
  onClose: () => void;
  onSubmit: (serviceData: ServiceData) => void;
  sectionId: string;
}

const discountOptions = [
  { value: "", label: "Aucune" },
  { value: "-15", label: "15%" },
  { value: "-30", label: "30%" },
  { value: "-50", label: "50%" }
];

const AddServiceModal = ({ onClose, onSubmit, sectionId }: AddServiceModalProps) => {
  const [serviceData, setServiceData] = useState<ServiceData>({
    title: '',
    description: '',
    duration: '00:30',
    originalPrice: '0',
    discount: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ServiceData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setServiceData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof ServiceData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDiscountChange = (value: string) => {
    setServiceData(prev => ({
      ...prev,
      discount: value
    }));
    if (errors.discount) {
      setErrors(prev => ({ ...prev, discount: '' }));
    }
  };

  const calculateDiscountedPrice = (originalPrice: number, discount: string): number => {
    if (!discount) return originalPrice;
    
    const discountValue = parseInt(discount);
    if (isNaN(discountValue)) return originalPrice;
    
    // Calculer le prix réduit 
    // Par exemple, pour une réduction de -15% sur 100€, on applique 100€ * (1 - 0.15) = 85€
    return originalPrice * (1 + discountValue / 100); // discount est négatif (ex: -15)
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof ServiceData, string>> = {};

    if (!serviceData.title.trim()) {
      newErrors.title = 'Le titre du service est requis';
    }

    const [hoursStr, minutesStr] = serviceData.duration.split(':');
    const hours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    const totalDuration = (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);

    if (totalDuration <= 0) {
      newErrors.duration = 'La durée doit être supérieure à 0 minute';
    }

    const originalPrice = parseFloat(serviceData.originalPrice);
    if (isNaN(originalPrice) || originalPrice < 0) {
      newErrors.originalPrice = 'Le prix ne peut pas être négatif';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Calculer le prix après réduction si applicable
      const discountedPrice = serviceData.discount 
        ? calculateDiscountedPrice(originalPrice, serviceData.discount)
        : undefined;
      
        const serviceToAdd = {
          title: serviceData.title.trim(),
          description: serviceData.description.trim(),
          duration: totalDuration,
          originalPrice: originalPrice,
          discount: serviceData.discount ? parseInt(serviceData.discount) : null,
          discountedPrice: serviceData.discount 
            ? calculateDiscountedPrice(originalPrice, serviceData.discount)
            : null,
          sectionId: sectionId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
      
      const servicesRef = collection(db, 'services');
      await addDoc(servicesRef, serviceToAdd);

      onSubmit(serviceData);
    } catch (err) {
      console.error("Erreur lors de l'ajout du service:", err);
      setErrors(prev => ({ ...prev, title: "Une erreur est survenue lors de l'enregistrement" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-gray-800 px-6 py-4 rounded-t-lg sticky top-0 z-10">
          <h3 className="text-lg font-medium text-white">Ajouter un service</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                Titre du service <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="title"
                name="title"
                value={serviceData.title}
                onChange={handleChange}
                className="w-full border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-0 focus:border-gray-800"
                placeholder="Ex: Coupe femme, Balayage..."
                disabled={isSubmitting}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                value={serviceData.description}
                onChange={handleChange}
                className="w-full min-h-[80px] border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-0 focus:border-gray-800"
                placeholder="Décrivez brièvement ce service..."
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
                Durée <span className="text-red-500">*</span>
              </Label>
              <input
                type="time"
                id="duration"
                name="duration"
                step="300"
                value={serviceData.duration}
                onChange={handleChange}
                className="w-full bg-white px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-800 focus:border-gray-800"
                disabled={isSubmitting}
              />
              {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="originalPrice" className="text-sm font-medium text-gray-700">
                Prix (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                id="originalPrice"
                name="originalPrice"
                value={serviceData.originalPrice}
                onChange={handleChange}
                className="w-full border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-0 focus:border-gray-800"
                disabled={isSubmitting}
              />
              {errors.originalPrice && <p className="mt-1 text-sm text-red-600">{errors.originalPrice}</p>}
            </div>


<div className="space-y-2">
  <Label htmlFor="discount" className="text-sm font-medium text-gray-700">
    Réduction
  </Label>
  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      onClick={() => handleDiscountChange("")}
      className={`px-3 py-1.5 rounded-md border ${
        serviceData.discount === "" 
          ? "bg-gray-800 text-white" 
          : "border-gray-800 text-gray-800 hover:bg-gray-100"
      }`}
    >
      Aucune
    </button>
    <button
      type="button"
      onClick={() => handleDiscountChange("-15")}
      className={`px-3 py-1.5 rounded-md border ${
        serviceData.discount === "-15" 
          ? "bg-red-600 text-white" 
          : "border-red-600 text-red-600 hover:bg-red-50"
      }`}
    >
      15%
    </button>
    <button
      type="button"
      onClick={() => handleDiscountChange("-30")}
      className={`px-3 py-1.5 rounded-md border ${
        serviceData.discount === "-30" 
          ? "bg-red-600 text-white" 
          : "border-red-600 text-red-600 hover:bg-red-50"
      }`}
    >
      30%
    </button>
    <button
      type="button"
      onClick={() => handleDiscountChange("-50")}
      className={`px-3 py-1.5 rounded-md border ${
        serviceData.discount === "-50" 
          ? "bg-red-600 text-white" 
          : "border-red-600 text-red-600 hover:bg-red-50"
      }`}
    >
      50%
    </button>
  </div>
  {errors.discount && <p className="mt-1 text-sm text-red-600">{errors.discount}</p>}

  {serviceData.discount && serviceData.originalPrice && (
    <div className="mt-2 text-sm text-gray-600 flex items-center">
      <span className="mr-2">Prix après réduction:</span>
      <span className="font-medium text-red-600">
        {calculateDiscountedPrice(
          parseFloat(serviceData.originalPrice),
          serviceData.discount
        ).toFixed(2)} €
      </span>
      <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
        {Math.abs(parseInt(serviceData.discount))}% de réduction
      </span>
    </div>
  )}
</div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-800 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-0"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-0"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout en cours...
                </>
              ) : (
                'Ajouter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServiceModal;