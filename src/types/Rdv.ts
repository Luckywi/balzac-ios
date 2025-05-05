export interface BaseRdv {
    id: string;
    serviceId: string;
    serviceTitle: string;   // ex : "Balayage"
    serviceDuration: number; // en minutes
    staffId: string;
    start: string; // ISO
    end: string;   // ISO
    notes?: string;
    createdAt: string;
    source: 'admin' | 'client';
  }
  
  // RDV client
  export interface ClientRdv extends BaseRdv {
    source: 'client';
    client: {
      name: string;
      phone: string;
      email: string;
    };
    price: number;
    paid: boolean;
  }
  
  // RDV admin
  export interface AdminRdv extends BaseRdv {
    source: 'admin';
    clientName?: string;
    price?: number;
    paid?: boolean;
  }
  