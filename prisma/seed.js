const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding master data...");

  // 1. Master Tax Setting (single active record)
  await prisma.masterTaxSetting.deleteMany({});
  await prisma.masterTaxSetting.create({
    data: {
      currentTcsPercentage: 5.0,
      notes: "Standard government mandated TCS on overseas tour packages (adjustable against income tax returns).",
      isActive: true,
    },
  });

  // 2. Master Pricing Labels
  const pricingLabels = [
    "5-Star Beachfront Luxury Villa (4 Nights)",
    "VIP Airport Meet & Greet + Private Transits",
    "Uluwatu Sunset Tour & Seafood Candlelight Dinner",
    "Tanjung Benoa Watersports Entry Tickets",
    "All-Inclusive Deluxe Resort Package",
    "Private Chauffeur & English Guide Services",
    "International Flight Tickets (Return)",
    "Travel & Medical Insurance",
    "Fast-Track Visa Processing Fees",
  ];
  for (const name of pricingLabels) {
    await prisma.masterPricingLabel.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // 3. Master Consultants
  const consultants = [
    { name: "Akshar Patel", phone: "+91 98765 43210", email: "akshar@tripcraft.com" },
    { name: "Priya Sharma", phone: "+91 98220 11223", email: "priya@tripcraft.com" },
    { name: "Rohan Varma", phone: "+91 99000 44556", email: "rohan@tripcraft.com" },
    { name: "Sneha Nair", phone: "+91 97111 88990", email: "sneha@tripcraft.com" },
  ];
  for (const c of consultants) {
    const existing = await prisma.masterConsultant.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.masterConsultant.create({ data: c });
    }
  }

  // 4. Master Cities (Indian Departure & International Destinations)
  const cities = [
    // India departure cities
    { name: "Mumbai", state: "Maharashtra", country: "India" },
    { name: "Delhi", state: "Delhi", country: "India" },
    { name: "Ahmedabad", state: "Gujarat", country: "India" },
    { name: "Bengaluru", state: "Karnataka", country: "India" },
    { name: "Chennai", state: "Tamil Nadu", country: "India" },
    { name: "Kolkata", state: "West Bengal", country: "India" },
    { name: "Hyderabad", state: "Telangana", country: "India" },
    { name: "Pune", state: "Maharashtra", country: "India" },
    { name: "Jaipur", state: "Rajasthan", country: "India" },
    { name: "Kochi", state: "Kerala", country: "India" },
    // International destinations
    { name: "Bali", state: "Bali", country: "Indonesia" },
    { name: "Seminyak", state: "Bali", country: "Indonesia" },
    { name: "Ubud", state: "Bali", country: "Indonesia" },
    { name: "Dubai", state: "Dubai", country: "United Arab Emirates" },
    { name: "Bangkok", state: "Bangkok", country: "Thailand" },
    { name: "Phuket", state: "Phuket", country: "Thailand" },
    { name: "Singapore", state: "Singapore", country: "Singapore" },
    { name: "Paris", state: "Île-de-France", country: "France" },
    { name: "Zurich", state: "Zurich", country: "Switzerland" },
    { name: "Rome", state: "Lazio", country: "Italy" },
    { name: "Tokyo", state: "Tokyo", country: "Japan" },
    { name: "Male", state: "Kaafu Atoll", country: "Maldives" },
  ];

  const cityMap = new Map();
  for (const c of cities) {
    const city = await prisma.masterCity.upsert({
      where: { name_country: { name: c.name, country: c.country } },
      update: { state: c.state },
      create: c,
    });
    cityMap.set(`${c.name}_${c.country}`, city.id);
  }

  const baliId = cityMap.get("Bali_Indonesia") || cityMap.get("Seminyak_Indonesia");
  const ubudId = cityMap.get("Ubud_Indonesia") || baliId;
  const dubaiId = cityMap.get("Dubai_United Arab Emirates");
  const phuketId = cityMap.get("Phuket_Thailand");

  // 5. Master Title Templates
  const titleTemplates = [
    "Magical 5 Days Bali Luxury Escape",
    "Exquisite 6D/5N Dubai Glamour & Desert Safari",
    "Tropical Romance: 7 Days Phuket & Krabi Island Hopping",
    "Alpine Wonders: 8 Days Switzerland Grand Highlights",
    "Cultural Treasures of Japan: 7 Days Tokyo & Kyoto",
    "Enchanting Maldives Private Overwater Villa Getaway",
    "Classic European Highlights: Paris, Lucerne & Rome",
    "Breathtaking 6 Days Singapore & Sentosa Family Vacation",
  ];
  for (const title of titleTemplates) {
    await prisma.masterTitleTemplate.upsert({
      where: { title },
      update: {},
      create: { title },
    });
  }

  // 6. Master Banner Images
  const bannerImages = [
    {
      label: "Bali - Tropical Luxury Pool Villa",
      imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
      destinationCityId: baliId,
    },
    {
      label: "Bali - Uluwatu Ocean Sunset",
      imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80",
      destinationCityId: baliId,
    },
    {
      label: "Dubai - Skyline & Burj Khalifa Twilight",
      imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
      destinationCityId: dubaiId,
    },
    {
      label: "Phuket - Emerald Waters & Longtail Boats",
      imageUrl: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80",
      destinationCityId: phuketId,
    },
  ];
  for (const b of bannerImages) {
    const existing = await prisma.masterBannerImage.findFirst({ where: { label: b.label } });
    if (!existing) {
      await prisma.masterBannerImage.create({ data: b });
    }
  }

  // 7. Master Policy Templates
  const policyTemplates = [
    {
      name: "Standard International Luxury Travel Policy",
      paymentPolicy: "<p><strong>Booking Deposit:</strong> 30% advance deposit at the time of reservation confirmation.</p><p><strong>Stage Payment:</strong> 50% payment required 30 days prior to departure date.</p><p><strong>Final Balance:</strong> Remaining 20% balance required 15 days prior to departure date.</p>",
      cancellationPolicy: "<p><strong>45+ Days prior to departure:</strong> 10% processing fee retained.</p><p><strong>30-44 Days prior:</strong> 30% of total tour cost charged as penalty.</p><p><strong>15-29 Days prior:</strong> 60% of total tour cost charged as penalty.</p><p><strong>Under 15 Days / No-show:</strong> 100% cancellation charge applies.</p>",
      visaRules: "<p>Passport must hold a minimum validity of 6 months from the date of return to India. E-Visa confirmation and return flight tickets must be presented at the airline check-in counter and destination immigration.</p>",
      generalNotes: "<p>Hotel check-in standard time is 14:00 hrs and check-out is 11:00 hrs. Private drivers wait up to 60 minutes after scheduled flight landing. Dynamic baggage and tax rules are subject to airline and local municipal regulations.</p>",
    },
    {
      name: "Flexible Island Hopping Policy (Bali / Phuket)",
      paymentPolicy: "<p><strong>Deposit:</strong> 25% token upon booking.</p><p><strong>Final Payment:</strong> 75% payment 14 days prior to travel.</p>",
      cancellationPolicy: "<p>Free cancellation up to 21 days before departure. 50% fee between 20 to 8 days. 100% within 7 days.</p>",
      visaRules: "<p>Visa on Arrival available for Indian passport holders (approx. 35 USD / 500,000 IDR) payable via card or cash at the airport.</p>",
      generalNotes: "<p>Carry waterproof bags for speedboat transfers and sunscreen SPF 50+. Lightweight cotton clothes recommended.</p>",
    },
  ];
  for (const p of policyTemplates) {
    await prisma.masterPolicyTemplate.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }

  // 8. Master Activities
  const activities = [
    {
      title: "Uluwatu Sunset Temple & Kecak Fire Dance",
      suggestedCityId: baliId,
      defaultDurationHours: 4.5,
      description: "Explore the ancient Uluwatu Cliff Temple perched 70 meters above the Indian Ocean. Witness the world-renowned traditional Kecak Fire Dance dramatizing the Ramayana epic during sunset.",
      inclusions: ["Temple entry tickets", "Kecak dance reserved seats", "Private AC chauffeur"],
      exclusions: ["Personal snacks & souvenirs"],
      loveTips: ["Request center row seating for direct view of dancers", "Arrive 45 mins early for photo ops"],
      watchOutTips: ["Keep shiny sunglasses and accessories inside bags due to curious monkeys"],
    },
    {
      title: "Ubud Sacred Monkey Forest & Jungle Terrace Swing",
      suggestedCityId: ubudId,
      defaultDurationHours: 6.0,
      description: "Soar over lush green rice paddies at the famous Alas Harum jungle swing. Afterwards, stroll through the shady canopy of the Sacred Monkey Forest Sanctuary with hundreds of long-tailed macaques.",
      inclusions: ["Jungle swing entrance & harness", "Monkey Forest sanctuary entry ticket", "Private transport"],
      exclusions: ["Lunch and cafe bills"],
      loveTips: ["Wear bright flowing dresses for high contrast against green rice terraces"],
      watchOutTips: ["Avoid making direct eye contact or carrying open snacks near monkeys"],
    },
    {
      title: "Dubai Desert Safari with BBQ Dinner & Tanoura Show",
      suggestedCityId: dubaiId,
      defaultDurationHours: 6.0,
      description: "Experience 4x4 dune bashing across the red Arabian dunes, camel rides, sandboarding, and an authentic Bedouin camp BBQ buffet dinner with live fire shows and Tanoura dancers.",
      inclusions: ["4x4 Dune bashing", "Camel ride", "BBQ buffet dinner", "Tanoura & Fire dance shows"],
      exclusions: ["Quad bike rentals", "Alcoholic beverages"],
      loveTips: ["Capture sunset photos from the crest of the highest dune"],
      watchOutTips: ["Avoid heavy meals 1 hour before dune bashing"],
    },
  ];
  for (const a of activities) {
    const existing = await prisma.masterActivity.findFirst({ where: { title: a.title } });
    if (!existing) {
      await prisma.masterActivity.create({ data: a });
    }
  }

  // 9. Master Hotels
  const hotels = [
    {
      name: "The Seminyak Beach Resort & Spa",
      cityId: baliId,
      starRating: 5,
      roomTypes: ["Beachfront Villa with Private Pool", "Ocean Suite", "Garden Pavilion Room"],
      mealPlans: ["Breakfast Included (CP)", "Half Board (MAP)", "All Inclusive"],
      guestScore: 4.8,
      guestScoreLabel: "Exceptional",
      facilities: ["Private Beach Access", "Infinity Ocean Pool", "Kahyangan Spa", "Free High-Speed WiFi", "Fitness Center"],
      nearbyAttractions: [
        { name: "Seminyak Square", distanceKm: 0.8 },
        { name: "Petitenget Beach & Temple", distanceKm: 1.2 },
        { name: "Ku De Ta Beachfront Lounge", distanceKm: 0.5 },
      ],
      nearbyRestaurants: [
        { name: "Breeze at The Samaya", distance: "400m" },
        { name: "La Lucciola Italian", distance: "900m" },
        { name: "Queen's Tandoor Indian", distance: "1.5km" },
      ],
      photos: [
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
      ],
    },
    {
      name: "Maya Ubud Resort & Spa",
      cityId: ubudId,
      starRating: 5,
      roomTypes: ["Heavenly Valley Pool Villa", "Deluxe Forest Room", "Superior Valley Suite"],
      mealPlans: ["Daily Buffet Breakfast", "Half Board Gourmet", "Full Board"],
      guestScore: 4.9,
      guestScoreLabel: "Superb",
      facilities: ["River Valley Infinity Pool", "Award-Winning River Spa", "Yoga Pavilion", "Tennis Court", "Forest Walk Trail"],
      nearbyAttractions: [
        { name: "Ubud Monkey Forest", distanceKm: 3.5 },
        { name: "Ubud Royal Palace & Market", distanceKm: 2.8 },
        { name: "Campuhan Ridge Walk", distanceKm: 4.0 },
      ],
      nearbyRestaurants: [
        { name: "River Cafe Organic", distance: "On-site" },
        { name: "Locavore Herbivore", distance: "2.5km" },
        { name: "Ganesha Ek Sanskriti Indian", distance: "3.0km" },
      ],
      photos: [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
      ],
    },
  ];
  for (const h of hotels) {
    const existing = await prisma.masterHotel.findFirst({ where: { name: h.name } });
    if (!existing) {
      await prisma.masterHotel.create({ data: h });
    }
  }

  // 10. Master Flight Routes
  const flightRoutes = [
    {
      sector: "BOM to DPS (Mumbai to Bali)",
      airline: "VietJet Air",
      flightCodeDefault: "VJ-884",
      typicalStops: 1,
      typicalLayoverInfo: "2h 15m layover at Ho Chi Minh City (SGN)",
      cabinBaggageKg: 7,
      checkInBaggageKg: 20,
      cancellationPolicy: "Non-refundable ticket. Date change allowed with airline penalty fee.",
      flightNotes: "In-flight hot meals and pre-booked extra baggage can be arranged.",
    },
    {
      sector: "DEL to DXB (Delhi to Dubai)",
      airline: "Emirates",
      flightCodeDefault: "EK-511",
      typicalStops: 0,
      typicalLayoverInfo: "Non-stop direct flight",
      cabinBaggageKg: 7,
      checkInBaggageKg: 30,
      cancellationPolicy: "Refundable with INR 4,500 cancellation fee up to 24h prior.",
      flightNotes: "Includes complimentary inflight entertainment and hot multi-course dining.",
    },
    {
      sector: "AMD to BKK (Ahmedabad to Bangkok)",
      airline: "Thai AirAsia",
      flightCodeDefault: "FD-143",
      typicalStops: 0,
      typicalLayoverInfo: "Non-stop direct flight",
      cabinBaggageKg: 7,
      checkInBaggageKg: 20,
      cancellationPolicy: "Airline credit shell provided upon cancellation.",
      flightNotes: "Arrives at Don Mueang International Airport (DMK).",
    },
  ];
  for (const f of flightRoutes) {
    const existing = await prisma.masterFlightRoute.findFirst({ where: { sector: f.sector } });
    if (!existing) {
      await prisma.masterFlightRoute.create({ data: f });
    }
  }

  // 11. Master Add-ons & Visa
  const addOns = [
    {
      name: "Indonesia Official E-VOA (Electronic Visa on Arrival)",
      type: "Visa",
      visaType: "Tourist E-VOA (30 Days Single Entry)",
      validityLength: "30 Days (Extendable by 30 days)",
      validityWindow: "90 Days from issuance date",
      defaultPrice: 3500,
      detailsDescription: "Fast-track electronic pre-approved visa on arrival. Clears immigration queues via dedicated e-gate barcode scanners.",
    },
    {
      name: "Dubai 30-Days Single Entry Tourist Visa + Insurance",
      type: "Visa",
      visaType: "Tourist E-Visa (Single Entry)",
      validityLength: "30 Days from entry",
      validityWindow: "60 Days from issuance",
      defaultPrice: 7200,
      detailsDescription: "Includes standard COVID-19 & emergency medical insurance covering up to $50,000 USD.",
    },
    {
      name: "Unlimited 5G International Roaming eSIM (10GB)",
      type: "SIM",
      visaType: "Prepaid Data eSIM",
      validityLength: "15 Days",
      validityWindow: "Instant QR activation",
      defaultPrice: 1800,
      detailsDescription: "Instant QR delivery via WhatsApp. High-speed 5G network across all major cellular carriers.",
    },
  ];
  for (const a of addOns) {
    const existing = await prisma.masterAddOn.findFirst({ where: { name: a.name } });
    if (!existing) {
      await prisma.masterAddOn.create({ data: a });
    }
  }

  // 12. Master Restaurants
  const restaurants = [
    {
      name: "Queen's Tandoor Seminyak",
      cityId: baliId,
      cuisineType: "North & South Indian",
      categoryType: "Restaurant",
      starRating: 4.6,
      reviewsCount: 850,
      offersPureVegJain: true,
    },
    {
      name: "La Lucciola Beachfront Italian",
      cityId: baliId,
      cuisineType: "Authentic Italian & Seafood",
      categoryType: "Restaurant",
      starRating: 4.8,
      reviewsCount: 1200,
      offersPureVegJain: false,
    },
    {
      name: "Ganesha Ek Sanskriti Ubud",
      cityId: ubudId,
      cuisineType: "Traditional Indian & Mughlai",
      categoryType: "Restaurant",
      starRating: 4.7,
      reviewsCount: 650,
      offersPureVegJain: true,
    },
    {
      name: "Finns Beach Club Canggu",
      cityId: baliId,
      cuisineType: "International & Cocktails",
      categoryType: "Beach Club",
      starRating: 4.9,
      reviewsCount: 3400,
      offersPureVegJain: true,
    },
  ];
  for (const r of restaurants) {
    const existing = await prisma.masterRestaurant.findFirst({ where: { name: r.name } });
    if (!existing) {
      await prisma.masterRestaurant.create({ data: r });
    }
  }

  // 13. Master Cost Rates (for Admin Cost Sheet calculation)
  const costRates = [
    { category: "Hotel", label: "5-Star Luxury Villa per Night (B2B)", defaultRate: 8500, unit: "per night", notes: "Contracted wholesale rate including service tax" },
    { category: "Hotel", label: "4-Star Deluxe Resort per Night (B2B)", defaultRate: 4800, unit: "per night", notes: "Includes breakfast buffet" },
    { category: "Transport", label: "Private Dedicated AC Van with Chauffeur (10 Hours)", defaultRate: 3200, unit: "per vehicle / day", notes: "Includes driver allowance and fuel" },
    { category: "Transport", label: "VIP Airport Meet & Greet + Luxury Transfer", defaultRate: 2200, unit: "per vehicle", notes: "Fast-track lobby meet" },
    { category: "Activity", label: "Uluwatu Temple & Kecak Dance Entry B2B", defaultRate: 850, unit: "per person", notes: "Group ticket rate" },
    { category: "Activity", label: "Alas Harum Jungle Swing & Rice Terrace Ticket", defaultRate: 1100, unit: "per person", notes: "Extreme swing + harness" },
    { category: "Guide", label: "English Speaking Tour Guide (Full Day)", defaultRate: 2500, unit: "per day", notes: "Government certified guide" },
    { category: "Visa", label: "Indonesia E-VOA Direct Cost", defaultRate: 2800, unit: "per person", notes: "Official gov tariff (500,000 IDR approx)" },
  ];
  for (const cr of costRates) {
    const existing = await prisma.masterCostRate.findFirst({ where: { label: cr.label } });
    if (!existing) {
      await prisma.masterCostRate.create({ data: cr });
    }
  }

  console.log("Master data successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
