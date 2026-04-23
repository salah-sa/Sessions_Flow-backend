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
        city: data.city || "Remote Node",
        countryCode: data.country_code
      };
    }
  });
};

export const useForwardGeocode = () => {
  return useMutation({
    mutationFn: async (city: string) => {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`);
      if (!response.ok) throw new Error("Geocoding Error");
      const data = await response.json();
      if (!data || data.length === 0) throw new Error("Location not found");
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  });
};

