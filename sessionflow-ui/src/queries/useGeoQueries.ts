import { useMutation } from "@tanstack/react-query";

export const useReverseGeocode = () => {
  return useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
      if (!response.ok) throw new Error("Synchronization Error");
      const data = await response.json();
      return data.address.city || data.address.town || data.address.village || data.address.state || "Unknown Node";
    }
  });
};

export const useIPGeolocation = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error("Fallback Synchronization Error");
      const data = await response.json();
      if (!data.latitude || !data.longitude) throw new Error("Invalid Geodata");
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city || "Remote Node"
      };
    }
  });
};

