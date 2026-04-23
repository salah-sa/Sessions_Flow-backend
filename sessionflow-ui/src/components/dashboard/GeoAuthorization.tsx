import { useEffect, useRef } from "react";
import { useAuthStore } from "../../store/stores";
import { useReverseGeocode, useIPGeolocation } from "../../queries/useGeoQueries";
import { useUpdateStudentLocation } from "../../queries/useStudentLocationQueries";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

/**
 * GeoAuthorization — Silent Auto-Detect (No UI)
 * 
 * On first mount, if the user has NO saved location (lat/lng) in DB,
 * this component silently auto-detects their location via:
 *   1. Browser Geolocation API (high accuracy)
 *   2. IP-based fallback (if browser is denied/unavailable)
 * 
 * Once detected, it saves to the backend and never triggers again.
 * Renders nothing — purely a side-effect component.
 */
export const GeoAuthorization: React.FC = () => {
  const { t } = useTranslation();
  const { studentLocation, setStudentLocationData, user, updateUser } = useAuthStore();
  const attempted = useRef(false);

  const { mutateAsync: reverseGeocode } = useReverseGeocode();
  const { mutateAsync: fetchIPGeo } = useIPGeolocation();
  const { mutate: updateBackendLocation } = useUpdateStudentLocation();

  // Already has location — bail completely
  const hasResolvedLocation = !!(studentLocation || (user?.latitude && user?.longitude));

  useEffect(() => {
    // Guard: skip if already resolved or already attempted this session
    if (hasResolvedLocation || attempted.current) return;
    attempted.current = true;

    const finalizeLocation = async (latitude: number, longitude: number, countryCode?: string) => {
      let city: string;
      try {
        city = await reverseGeocode({ lat: latitude, lng: longitude });
      } catch {
        city = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      }

      const locationData = {
        city,
        countryCode,
        lat: latitude,
        lng: longitude,
        source: 'auto' as const,
        timestamp: Date.now(),
      };

      // Save to local store
      setStudentLocationData(locationData);

      // Persist to backend DB (one-time save)
      updateBackendLocation({ lat: latitude, lng: longitude, city });

      // Update user object so the check above (`user?.latitude`) prevents future triggers
      if (user) {
        updateUser({ ...user, latitude, longitude, city });
      }

      toast.success(t("dashboard.geo.sync_success", { city }), {
        icon: "📍",
        duration: 3000,
      });
    };

    const tryIPFallback = async () => {
      try {
        const data = await fetchIPGeo();
        await finalizeLocation(data.lat, data.lng, data.countryCode);
      } catch {
        // Silent fail — user can manually trigger from settings later
        console.warn("[GeoAuthorization] IP-based geolocation also failed. No location saved.");
      }
    };

    // Auto-detect silently
    if (!navigator.geolocation) {
      tryIPFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await finalizeLocation(position.coords.latitude, position.coords.longitude);
      },
      async () => {
        // Browser denied or timeout → fall back to IP
        await tryIPFallback();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [hasResolvedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renders nothing — purely a side-effect component
  return null;
};
