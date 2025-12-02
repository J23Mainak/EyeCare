/// <reference types="google.maps" />
import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  MapPin,
  UserCheck,
  Stethoscope,
  Search,
  Bookmark,
  Database
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiService from "@/lib/api";
import {
  useLoadScript,
  GoogleMap,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { useAuth } from "@/contexts/AuthContext";


interface Doctor {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string | null;
  };
  specialization: string;
  experience: number;
  location?: {
    coordinates?: [number, number];
    address?: { formatted?: string };
  };
  geometry?: { location?: { lat: number; lng: number } };
  rating?: { average: number; count: number };
  distance?: number | null;
  contact?: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  source?: "database" | "google"; // Track data source
}

const doctorLatLng = (
  d?: Doctor | null
): { lat: number; lng: number } | null => {
  if (!d) return null;
  try {
    if (d.geometry?.location && typeof d.geometry.location.lat === "number") {
      return { lat: d.geometry.location.lat, lng: d.geometry.location.lng };
    }
    if (d.location?.coordinates && d.location.coordinates.length === 2) {
      // Mongo GeoJSON stored as [lng, lat]
      return { lat: d.location.coordinates[1], lng: d.location.coordinates[0] };
    }
  } catch (err) {
    // defensive: log and return null
    console.warn("doctorLatLng parse error for doctor:", d, err);
    return null;
  }
  return null;
};

// Google Places API libraries
const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export default function Doctors() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    attemptGeolocation();
    loadSampleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { toast } = useToast();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isRealData, setIsRealData] = useState(false);
  const [searchSource, setSearchSource] = useState<
    "database" | "google" | "both"
  >("google");
  const [searchFilters, setSearchFilters] = useState({
    specialization: "all",
    maxDistance: 50,
  });

  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded: mapLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY || "",
    libraries: libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const loadSampleData = () => {
    const sampleDoctors: Doctor[] = [
      {
        _id: "1",
        user: {
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          profileImage: null,
        },
        specialization: "Retina Specialist",
        experience: 15,
        location: {
          coordinates: [-74.0007, 40.7336],
          address: { formatted: "123 Medical Center Dr, New York, NY" },
        },
        rating: { average: 4.8, count: 127 },
        distance: 2.5,
        contact: {
          phone: "+1-555-0123",
          email: "john.smith@example.com",
          website: "https://example.com",
        },
        source: "database",
      },
      {
        _id: "2",
        user: {
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@example.com",
          profileImage: null,
        },
        specialization: "Ophthalmologist",
        experience: 12,
        location: {
          coordinates: [-73.9851, 40.7484],
          address: { formatted: "456 Eye Care Ave, New York, NY" },
        },
        rating: { average: 4.6, count: 89 },
        distance: 3.2,
        contact: {
          phone: "+1-555-0456",
          email: "sarah.johnson@example.com",
          website: null,
        },
        source: "database",
      },
    ];
    setDoctors(sampleDoctors);
    setIsRealData(false);
  };

  const attemptGeolocation = (options?: PositionOptions) => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (lat === 0 && lng === 0) {
          toast({
            title: "Invalid location",
            description:
              "Automatic location returned 0,0. Please enter coordinates manually.",
            variant: "destructive",
          });
          return;
        }
        setUserLocation({ lat, lng });
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast({
          title: "Location access blocked",
          description:
            "Please enable location for your browser or enter coordinates manually below.",
          variant: "destructive",
        });
      },
      { timeout: 10000, maximumAge: 60_000, ...(options || {}) }
    );
  };

  // Helper function to calculate distance between two points
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Google Places API search for nearby doctors
  const searchGooglePlaces = async (): Promise<Doctor[]> => {
    if (!userLocation || !mapLoaded || !window.google) {
      throw new Error("Google Maps not loaded or location not available");
    }

    return new Promise((resolve, reject) => {
      const service = new google.maps.places.PlacesService(mapRef.current!);

      // Determine search keywords based on specialization
      const getSearchKeyword = (spec: string) => {
        switch (spec) {
          case "Retina Specialist":
            return "retina specialist ophthalmologist";
          case "Ophthalmologist":
            return "ophthalmologist eye doctor";
          case "Optometrist":
            return "optometrist eye care";
          case "General Eye Care":
            return "eye doctor ophthalmologist optometrist";
          default:
            return "ophthalmologist eye doctor retina specialist";
        }
      };

      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
        radius: searchFilters.maxDistance * 1000, // Convert km to meters
        type: "doctor",
        keyword: getSearchKeyword(searchFilters.specialization),
      };

      console.log("Google Places search request:", request);

      service.nearbySearch(request, (results, status) => {
        console.log("Google Places search status:", status);
        console.log("Google Places search results:", results);

        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const googleDoctors: Doctor[] = results
            .filter((place) => place.geometry?.location) // Only places with location
            .map((place, index) => {
              const lat = place.geometry!.location!.lat();
              const lng = place.geometry!.location!.lng();

              return {
                _id: place.place_id || `google-${index}`,
                user: {
                  firstName: place.name?.split(" ")[1] || "Dr.",
                  lastName:
                    place.name?.split(" ").slice(2).join(" ") ||
                    place.name?.split(" ")[0] ||
                    `Doctor ${index + 1}`,
                  email: "contact@example.com",
                  profileImage:
                    place.photos?.[0]?.getUrl({ maxWidth: 100 }) || null,
                },
                specialization:
                  searchFilters.specialization === "all"
                    ? "Eye Care Specialist"
                    : searchFilters.specialization,
                experience: Math.floor(Math.random() * 20) + 5, // Random experience for demo
                geometry: {
                  location: { lat, lng },
                },
                location: {
                  address: {
                    formatted:
                      place.vicinity ||
                      place.formatted_address ||
                      "Address not available",
                  },
                },
                rating: place.rating
                  ? {
                      average: place.rating,
                      count: place.user_ratings_total || 0,
                    }
                  : undefined,
                distance: calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  lat,
                  lng
                ),
                contact: {
                  phone: place.formatted_phone_number || null,
                  email: null,
                  website: place.website || null,
                },
                source: "google" as const,
              };
            })
            .sort((a, b) => {
              // Calculate composite score for each doctor
              const getScore = (doctor) => {
                let score = 0;

                // Rating weight (0-50 points)
                const rating = doctor.rating?.average || 0;
                score += rating * 10; // 5-star = 50 points

                // Review count weight (0-20 points)
                const reviewCount = doctor.rating?.count || 0;
                score += Math.min(reviewCount / 10, 20); // Cap at 20 points

                // Experience weight (0-20 points)
                score += Math.min(doctor.experience, 20);

                // Distance penalty (subtract points for farther doctors)
                const distance = doctor.distance || 999;
                score -= distance * 2; // 2 points penalty per km

                // Specialization bonus (10 points for exact match)
                if (
                  searchFilters.specialization !== "all" &&
                  doctor.specialization === searchFilters.specialization
                ) {
                  score += 10;
                }

                return score;
              };

              return getScore(b) - getScore(a); // Higher score first
            });

          resolve(googleDoctors);
        } else {
          console.error("Google Places search failed:", status);
          reject(new Error(`Google Places search failed: ${status}`));
        }
      });
    });
  };

  // safe user icon creation (only use google when loaded)
  const userMarkerIcon = (() => {
    if (mapLoaded && window.google?.maps) {
      return {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
      } as google.maps.Symbol;
    }
    return undefined;
  })();

  // Database search for nearby doctors
  const searchNearbyDoctors = async (): Promise<Doctor[]> => {
    if (!userLocation) {
      throw new Error("Location required for nearby search");
    }

    const res = await apiService.getNearbyDoctors(
      userLocation.lat,
      userLocation.lng,
      searchFilters.maxDistance,
      searchFilters.specialization === "all"
        ? undefined
        : searchFilters.specialization
    );

    const found = Array.isArray(res) ? res : res?.doctors ?? [];
    return (found || [])
      .filter(Boolean)
      .map((doc) => ({ ...doc, source: "database" as const }));
  };

  const searchAllDoctors = async (): Promise<Doctor[]> => {
    const res = await apiService.getAllDoctors({
      specialization:
        searchFilters.specialization === "all"
          ? undefined
          : searchFilters.specialization,
      limit: 20,
    });

    const found = Array.isArray(res) ? res : res?.doctors ?? [];
    return (found || [])
      .filter(Boolean)
      .map((doc) => ({ ...doc, source: "database" as const }));
  };

  const handleSearch = async () => {
    if (!userLocation && searchSource !== "database") {
      toast({
        title: "Location required",
        description:
          "Please allow location access or enter coordinates to find nearby doctors.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    let allDoctors: Doctor[] = [];

    try {
      if (searchSource === "google" || searchSource === "both") {
        try {
          const googleDoctors = await searchGooglePlaces();
          allDoctors = [...allDoctors, ...googleDoctors];
          console.log(
            `Found ${googleDoctors.length} doctors from Google Places`
          );
        } catch (err) {
          console.error("Google Places search error:", err);
          toast({
            title: "Google Places search failed",
            description: "Trying database search as fallback.",
            variant: "destructive",
          });
        }
      }

      if (searchSource === "database" || searchSource === "both") {
        try {
          const dbDoctors = userLocation
            ? await searchNearbyDoctors()
            : await searchAllDoctors();
          allDoctors = [...allDoctors, ...dbDoctors];
          console.log(`Found ${dbDoctors.length} doctors from database`);
        } catch (err) {
          console.error("Database search error:", err);
        }
      }

      // Remove duplicates and sort by distance if available
      const uniqueDoctors = allDoctors.filter(
        (doctor, index, self) =>
          index === self.findIndex((d) => d._id === doctor._id)
      );

      if (uniqueDoctors.length > 0) {
        uniqueDoctors.sort((a, b) => {
          // Calculate composite score for each doctor
          const getScore = (doctor) => {
            let score = 0;

            // Rating weight (0-50 points)
            const rating = doctor.rating?.average || 0;
            score += rating * 10; // 5-star = 50 points

            // Review count weight (0-20 points)
            const reviewCount = doctor.rating?.count || 0;
            score += Math.min(reviewCount / 10, 20); // Cap at 20 points

            // Experience weight (0-20 points)
            score += Math.min(doctor.experience, 20);

            // Distance penalty (subtract points for farther doctors)
            const distance = doctor.distance || 999;
            score -= distance * 2; // 2 points penalty per km

            // Specialization bonus (10 points for exact match)
            if (
              searchFilters.specialization !== "all" &&
              doctor.specialization === searchFilters.specialization
            ) {
              score += 10;
            }

            return score;
          };

          return getScore(b) - getScore(a); // Higher score first
        });

        // Merge with existing bookmarked doctors data
        const savedDoctorsData = localStorage.getItem("bookmarkedDoctorsData");
        let existingBookmarkedDoctors: Doctor[] = [];
        if (savedDoctorsData) {
          existingBookmarkedDoctors = JSON.parse(savedDoctorsData);
        }

        // Merge and remove duplicates
        const mergedDoctors = [...uniqueDoctors];
        existingBookmarkedDoctors.forEach((bookmarked) => {
          if (!mergedDoctors.find((d) => d._id === bookmarked._id)) {
            mergedDoctors.push(bookmarked);
          }
        });

        setDoctors(mergedDoctors);

        // Update bookmarked doctors data in localStorage (user-specific)
        if (user?._id) {
          const userDoctorsDataKey = `bookmarkedDoctorsData_${user._id}`;
          const bookmarkedDoctorsData = mergedDoctors.filter((d) =>
            bookmarkedDoctors.has(d._id)
          );
          localStorage.setItem(
            userDoctorsDataKey,
            JSON.stringify(bookmarkedDoctorsData)
          );
        }
        setIsRealData(true);

        toast({
          title: "Search completed",
          description: `Found ${uniqueDoctors.length} doctors nearby.`,
        });

        // Pan to first doctor if map present
        const first = doctorLatLng(uniqueDoctors[0]);
        if (first && mapRef.current) {
          mapRef.current.panTo(first);
        }
      } else {
        toast({
          title: "No nearby doctors found",
          description: "Try increasing distance or changing specialization.",
          variant: "default",
        });
        loadSampleData(); // Fallback to sample data
      }
    } catch (err) {
      console.error("Search error:", err);
      toast({
        title: "Search error",
        description: "Could not fetch doctors. Showing sample data.",
        variant: "destructive",
      });
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRealData = async () => {
    setLoading(true);
    try {
      const dbDoctors = await searchAllDoctors();
      if (dbDoctors.length > 0) {
        setDoctors(dbDoctors);
        setIsRealData(true);
        toast({
          title: "Real data loaded",
          description: "Doctors loaded from server.",
        });
      } else {
        toast({
          title: "No doctors in database",
          description: "No doctors found in your database.",
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Load real data error:", err);
      toast({
        title: "Error",
        description: "Could not fetch doctors from database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [bookmarkedDoctors, setBookmarkedDoctors] = useState<Set<string>>(
    new Set()
  );

  // Load bookmarks and their full data from localStorage (user-specific)
  useEffect(() => {
    if (!user?._id) return;

    const currentUserId = localStorage.getItem("currentUserId");
    if (currentUserId && currentUserId !== user._id) {
      // User changed - clear all user-specific data
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (
          key.startsWith("bookmarkedDoctors_") ||
          key.startsWith("bookmarkedDoctorsData_")
        ) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem("currentUserId", user._id);
      setBookmarkedDoctors(new Set());
      return;
    }

    const userBookmarkKey = `bookmarkedDoctors_${user._id}`;
    const userDoctorsDataKey = `bookmarkedDoctorsData_${user._id}`;

    const saved = localStorage.getItem(userBookmarkKey);
    const savedDoctorsData = localStorage.getItem(userDoctorsDataKey);

    if (saved) {
      setBookmarkedDoctors(new Set(JSON.parse(saved)));
    } else {
      setBookmarkedDoctors(new Set());
    }

    // Restore full doctor data if available
    if (savedDoctorsData) {
      const doctorsData = JSON.parse(savedDoctorsData);
      setDoctors(doctorsData);
    }
  }, [user?._id]);

  // Toggle bookmark
  const toggleBookmark = (doctorId: string) => {
    if (!user?._id) {
      toast({
        title: "Login Required",
        description: "Please log in to bookmark doctors",
        variant: "destructive",
      });
      return;
    }

    const userBookmarkKey = `bookmarkedDoctors_${user._id}`;
    const userDoctorsDataKey = `bookmarkedDoctorsData_${user._id}`;

    setBookmarkedDoctors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(doctorId)) {
        newSet.delete(doctorId);
        toast({
          title: "Bookmark removed",
          description: "Doctor removed from your bookmarks",
        });
      } else {
        newSet.add(doctorId);
        toast({
          title: "Bookmarked!",
          description: "Doctor added to your bookmarks",
        });
      }

      // Save with user-specific key
      localStorage.setItem(userBookmarkKey, JSON.stringify([...newSet]));

      // Save full doctor data for bookmarked doctors with user-specific key
      const bookmarkedDoctorsData = doctors.filter((d) => newSet.has(d._id));
      localStorage.setItem(
        userDoctorsDataKey,
        JSON.stringify(bookmarkedDoctorsData)
      );

      return newSet;
    });
  };

  // Get directions using Google Maps
  const getDirections = (doctor: Doctor) => {
    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Enable location to get directions",
        variant: "destructive",
      });
      return;
    }

    const loc = doctorLatLng(doctor);
    if (!loc) {
      toast({
        title: "Location Not Available",
        description: "Doctor's location is not available",
        variant: "destructive",
      });
      return;
    }

    const origin = `${userLocation.lat},${userLocation.lng}`;
    const destination = `${loc.lat},${loc.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    window.open(url, "_blank");
  };

  // Make phone call
  const makeCall = (phoneNumber: string | null | undefined) => {
    if (!phoneNumber) {
      toast({
        title: "Phone Not Available",
        description: "This doctor's phone number is not available",
        variant: "destructive",
      });
      return;
    }
    window.location.href = `tel:${phoneNumber}`;
  };

  // choose a center: userLocation else first doctor else default
  const safeDoctors = doctors.filter(Boolean);
  const mapCenter = userLocation ??
    doctorLatLng(safeDoctors[0]) ?? { lat: 40.7128, lng: -74.006 };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 space-y-6 bg-[#FAF9F6]">
      <div className="mb-8">
        <div className="flex items-center gap-3 px-1">
          <div className="p-3 bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-white relative -top-0.5" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold">Find Doctors</h1>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Stethoscope className="h-4 w-4 text-amber-600" />
              Discover retina care specialists and ophthalmologists near you
            </p>
          </div>
        </div>

        {!isRealData && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              📋 Showing sample data. Use search options below to find real
              doctors.
            </p>
          </div>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search Source</Label>
              <Select
                value={searchSource}
                onValueChange={(v) =>
                  setSearchSource(v as "database" | "google" | "both")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Google Places
                    </div>
                  </SelectItem>
                  <SelectItem value="database">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Database
                    </div>
                  </SelectItem>
                  <SelectItem value="both">Both Sources</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Specialization</Label>
              <Select
                value={searchFilters.specialization}
                onValueChange={(v) =>
                  setSearchFilters({ ...searchFilters, specialization: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All specializations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All specializations</SelectItem>
                  <SelectItem value="Retina Specialist">
                    Retina Specialist
                  </SelectItem>
                  <SelectItem value="Ophthalmologist">
                    Ophthalmologist
                  </SelectItem>
                  <SelectItem value="Optometrist">Optometrist</SelectItem>
                  <SelectItem value="General Eye Care">
                    General Eye Care
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Max Distance (km)</Label>
              <Select
                value={String(searchFilters.maxDistance)}
                onValueChange={(v) =>
                  setSearchFilters({
                    ...searchFilters,
                    maxDistance: parseInt(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 km</SelectItem>
                  <SelectItem value="10">10 km</SelectItem>
                  <SelectItem value="25">25 km</SelectItem>
                  <SelectItem value="50">50 km</SelectItem>
                  <SelectItem value="100">100 km</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={
                  loading || (!userLocation && searchSource !== "database")
                }
                className="w-full"
              >
                {loading ? "Searching..." : "Search Doctors"}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleLoadRealData}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? "Loading..." : "Load Database Only"}
            </Button>
            <Button
              onClick={loadSampleData}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Load Sample Data
            </Button>
            {isRealData && (
              <div className="flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <span className="text-sm text-green-800">
                  Real data loaded (
                  {doctors.filter((d) => d.source === "google").length} Google,{" "}
                  {doctors.filter((d) => d.source === "database").length}{" "}
                  Database)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {mapLoaded && GOOGLE_API_KEY ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Map View</CardTitle>
            <CardDescription>View doctors on the map</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 400 }}>
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={userLocation ? 12 : 11}
                onLoad={(map) => {
                  mapRef.current = map;
                }}
              >
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={userMarkerIcon as any}
                    title="Your Location"
                  />
                )}

                {safeDoctors.map((d) => {
                  const loc = doctorLatLng(d);
                  if (!loc) return null;
                  return (
                    <Marker
                      key={d._id}
                      position={loc}
                      onClick={() => setSelectedDoctor(d)}
                      icon={
                        d.source === "google"
                          ? undefined
                          : {
                              path: window.google?.maps?.SymbolPath.CIRCLE,
                              scale: 6,
                              fillColor: "#10b981",
                              fillOpacity: 1,
                              strokeWeight: 2,
                              strokeColor: "#ffffff",
                            }
                      }
                    />
                  );
                })}

                {selectedDoctor &&
                  (() => {
                    const loc = doctorLatLng(selectedDoctor);
                    if (!loc) return null;
                    return (
                      <InfoWindow
                        position={loc}
                        onCloseClick={() => setSelectedDoctor(null)}
                      >
                        <div style={{ maxWidth: 280 }}>
                          <div className="flex items-center gap-2 mb-2">
                            <strong>
                              Dr. {selectedDoctor.user.firstName}{" "}
                              {selectedDoctor.user.lastName}
                            </strong>
                            <Badge
                              variant={
                                selectedDoctor.source === "google"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {selectedDoctor.source === "google"
                                ? "Google"
                                : "DB"}
                            </Badge>
                          </div>
                          <div style={{ fontSize: 13, marginTop: 4 }}>
                            {selectedDoctor.specialization}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 13 }}>
                            {selectedDoctor.location?.address?.formatted}
                          </div>
                          <div style={{ marginTop: 6, fontSize: 13 }}>
                            <em>Rating:</em>{" "}
                            {selectedDoctor.rating?.average?.toFixed(1) ??
                              "N/A"}{" "}
                            ({selectedDoctor.rating?.count ?? 0} reviews)
                          </div>
                          {selectedDoctor.distance && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: "#666",
                              }}
                            >
                              {selectedDoctor.distance.toFixed(1)} km away
                            </div>
                          )}
                        </div>
                      </InfoWindow>
                    );
                  })()}
              </GoogleMap>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Map View</CardTitle>
            <CardDescription>Google Maps integration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600">
                  {!mapLoaded
                    ? "Loading Google Maps..."
                    : "Google Maps integration"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  API Key: {GOOGLE_API_KEY ? "Configured" : "Not configured"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookmarked Doctors Section - Always Show */}
      <Card className="mb-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
              <Bookmark className="h-5 w-5 text-white fill-current" />
            </div>
            <div>
              <CardTitle className="text-lg">My Bookmarks</CardTitle>
              <CardDescription className="text-amber-700">
                {safeDoctors.filter((d) => bookmarkedDoctors.has(d._id)).length}{" "}
                saved doctor(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {safeDoctors.filter((d) => bookmarkedDoctors.has(d._id)).length ===
          0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-4 bg-amber-100 rounded-full mb-3">
                <Bookmark className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No bookmarks yet
              </h3>
              <p className="text-sm text-gray-500">
                Click the bookmark icon on any doctor card to save them here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeDoctors
                .filter((d) => bookmarkedDoctors.has(d._id))
                .map((doctor) => (
                  <Card
                    key={doctor._id}
                    className="hover:shadow-xl transition-all duration-300 relative overflow-hidden ring-2 ring-amber-400"
                  >
                    {/* Bookmark Button */}
                    <button
                      onClick={() => toggleBookmark(doctor._id)}
                      className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-200 bg-amber-500 hover:bg-amber-600 shadow-lg"
                      title="Remove bookmark"
                    >
                      <Bookmark className="h-5 w-5 transition-all text-white fill-current" />
                    </button>

                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between pr-12">
                        <div className="flex-1">
                          <div className="mb-1">
                            <CardTitle className="text-lg">
                              Dr. {doctor.user.firstName} {doctor.user.lastName}
                            </CardTitle>
                          </div>
                          <CardDescription className="text-sm">
                            {doctor.specialization}
                          </CardDescription>
                        </div>
                      </div>
                      {doctor.user.profileImage && (
                        <img
                          src={doctor.user.profileImage}
                          alt={`${doctor.user.firstName}`}
                          className="absolute top-4 right-16 w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                        />
                      )}
                    </CardHeader>

                    <CardContent>
                      {/* Address */}
                      <div className="flex items-start gap-2 text-sm text-gray-600 min-h-[60px]">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                        <span className="line-clamp-3">
                          {doctor.location?.address?.formatted ??
                            (doctor.geometry?.location
                              ? `${doctor.geometry.location.lat.toFixed(
                                  4
                                )}, ${doctor.geometry.location.lng.toFixed(4)}`
                              : "Address not available")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {safeDoctors.map((doctor) => (
          <Card
            key={doctor._id}
            className={`hover:shadow-xl transition-all duration-300 relative overflow-hidden h-full flex flex-col ${
              bookmarkedDoctors.has(doctor._id) ? "ring-2 ring-amber-400" : ""
            }`}
          >
            {/* Bookmark Button - Top Right */}
            <button
              onClick={() => toggleBookmark(doctor._id)}
              className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-200 ${
                bookmarkedDoctors.has(doctor._id)
                  ? "bg-amber-500 hover:bg-amber-600 shadow-lg"
                  : "bg-white/90 hover:bg-amber-100 shadow-md"
              }`}
              title={
                bookmarkedDoctors.has(doctor._id)
                  ? "Remove bookmark"
                  : "Add bookmark"
              }
            >
              <Bookmark
                className={`h-5 w-5 transition-all ${
                  bookmarkedDoctors.has(doctor._id)
                    ? "text-white fill-current"
                    : "text-amber-500"
                }`}
              />
            </button>

            {/* All Doctors Grid */}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between pr-12">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">
                      Dr. {doctor.user.firstName} {doctor.user.lastName}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    {doctor.specialization}
                  </CardDescription>
                </div>
              </div>
              {doctor.user.profileImage && (
                <img
                  src={doctor.user.profileImage}
                  alt={`${doctor.user.firstName}`}
                  className="absolute top-4 right-16 w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                />
              )}
            </CardHeader>

            {/* Make CardContent grow so footer sticks to bottom */}
            <CardContent className="flex-1 flex flex-col">
              {/* Top content that can grow */}
              <div className="space-y-3">
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(doctor.rating?.average || 0)
                            ? "text-amber-500 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">
                    {doctor.rating?.average?.toFixed?.(1) ?? "N/A"}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({doctor.rating?.count ?? 0} reviews)
                  </span>
                </div>

                {/* Address - reserve ~3 lines height (adjust min-h if needed) */}
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                  <span
                    className="block line-clamp-3 min-h-[72px] overflow-hidden text-sm leading-6"
                    title={doctor.location?.address?.formatted}
                  >
                    {doctor.location?.address?.formatted ??
                      (doctor.geometry?.location
                        ? `${doctor.geometry.location.lat.toFixed(
                            4
                          )}, ${doctor.geometry.location.lng.toFixed(4)}`
                        : "Address not available")}
                  </span>
                </div>
              </div>

              {/* Footer anchored to bottom: distance (or invisible placeholder) -> experience -> Get Directions */}
              <div className="mt-auto">
                <div className="flex items-center py-3">
                  <Badge
                    variant="secondary"
                    className={`w-fit ${
                      doctor.distance == null ? "invisible" : ""
                    }`}
                    aria-hidden={doctor.distance == null}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {doctor.distance != null
                      ? `${Number(doctor.distance).toFixed(1)} km away`
                      : "placeholder"}
                  </Badge>
                </div>

                {/* Experience */}
                <div className="flex items-center gap-2 text-sm mt-0">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span className="font-medium">{doctor.experience} years</span>
                  <span className="text-gray-500">experience</span>
                </div>

                <div className="mt-2">
                  <Button
                    className="w-full bg-gradient-to-r hover:from-teal-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all"
                    onClick={() => getDirections(doctor)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {safeDoctors.length === 0 && !loading && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No doctors found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search filters, enable location access, or click
            "Load Sample Data".
          </p>
          <Button onClick={loadSampleData} variant="outline">
            Load Sample Data
          </Button>
        </div>
      )}
    </div>
  );
}