export const DEFAULT_PLACE_CATEGORIES = [
  "Sightseeing",
  "Temple / Spiritual",
  "Heritage & Forts",
  "Nature & Outdoors",
  "Beach & Water",
  "Market & Shopping",
  "Museum & Culture",
  "Adventure & Activity",
  "Food & Nightlife",
  "Wildlife / Safari",
  "Wellness & Spa",
];

export const DEFAULT_VEHICLE_TYPES = [
  {
    name: "Flight",
    applicableFields: ["flightCodeDefault", "travelTime", "typicalStops", "typicalLayoverInfo", "cabinBaggageKg", "checkInBaggageKg", "cancellationPolicy", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Train",
    applicableFields: ["flightCodeDefault", "travelTime", "typicalStops", "cabinBaggageKg", "cancellationPolicy", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Bus",
    applicableFields: ["travelTime", "typicalStops", "cancellationPolicy", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Luxury Coach",
    applicableFields: ["travelTime", "typicalStops", "cancellationPolicy", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Car",
    applicableFields: ["travelTime", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Sedan",
    applicableFields: ["travelTime", "flightNotes"],
    isDefault: true,
  },
  {
    name: "SUV",
    applicableFields: ["travelTime", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Tempo Traveller",
    applicableFields: ["travelTime", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Ferry / Boat",
    applicableFields: ["travelTime", "cancellationPolicy", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Helicopter",
    applicableFields: ["travelTime", "cabinBaggageKg", "cancellationPolicy", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Auto Rickshaw",
    applicableFields: ["travelTime", "flightNotes"],
    isDefault: true,
  },
  {
    name: "Other",
    applicableFields: ["flightCodeDefault", "travelTime", "typicalStops", "typicalLayoverInfo", "cabinBaggageKg", "checkInBaggageKg", "cancellationPolicy", "flightNotes"],
    isDefault: true,
  },
];

export const DEFAULT_ADDON_CATEGORIES = [
  {
    name: "Visa",
    applicableFields: ["visaType", "validityLength", "validityWindow", "detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "Transfer",
    applicableFields: ["detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "Activity",
    applicableFields: ["detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "Insurance",
    applicableFields: ["validityLength", "detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "SIM Card",
    applicableFields: ["validityLength", "detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "Sightseeing Pass",
    applicableFields: ["validityLength", "detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "Cruises & Water Sports",
    applicableFields: ["detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "Special Experience",
    applicableFields: ["detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
  {
    name: "Other",
    applicableFields: ["visaType", "validityLength", "validityWindow", "detailsDescription", "defaultPrice", "cityId"],
    isDefault: true,
  },
];

export const DEFAULT_RESTAURANT_CATEGORIES = [
  "Restaurant",
  "Beach Club",
  "Night Club",
  "Cafe",
  "Fine Dining",
  "Boutique Lounge",
  "Street Food Hub",
  "Rooftop Bar & Grill",
];
