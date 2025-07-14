// Marcas predeterminadas para equipos de transporte en EEUU

export interface BrandOption {
  value: string;
  label: string;
  popular?: boolean; // Para destacar las marcas más populares
}

// Marcas de camiones más comunes en EEUU
export const TRUCK_BRANDS: BrandOption[] = [
  { value: "freightliner", label: "Freightliner", popular: true },
  { value: "peterbilt", label: "Peterbilt", popular: true },
  { value: "kenworth", label: "Kenworth", popular: true },
  { value: "volvo", label: "Volvo", popular: true },
  { value: "mack", label: "Mack", popular: true },
  { value: "international", label: "International", popular: true },
  { value: "western-star", label: "Western Star" },
  { value: "ford", label: "Ford" },
  { value: "chevrolet", label: "Chevrolet" },
  { value: "gmc", label: "GMC" },
  { value: "isuzu", label: "Isuzu" },
  { value: "hino", label: "Hino" },
  { value: "mitsubishi-fuso", label: "Mitsubishi Fuso" },
  { value: "ram", label: "Ram" },
  { value: "nissan", label: "Nissan" },
].sort((a, b) => a.label.localeCompare(b.label));

// Marcas de remolques/trailers más comunes en EEUU
export const TRAILER_BRANDS: BrandOption[] = [
  { value: "great-dane", label: "Great Dane", popular: true },
  { value: "wabash", label: "Wabash", popular: true },
  { value: "utility", label: "Utility", popular: true },
  { value: "hyundai-translead", label: "Hyundai Translead", popular: true },
  { value: "stoughton", label: "Stoughton", popular: true },
  { value: "dorsey", label: "Dorsey", popular: true },
  { value: "wilson", label: "Wilson" },
  { value: "fontaine", label: "Fontaine" },
  { value: "manac", label: "Manac" },
  { value: "timpte", label: "Timpte" },
  { value: "transcraft", label: "Transcraft" },
  { value: "reitnouer", label: "Reitnouer" },
  { value: "vanguard", label: "Vanguard" },
  { value: "mac-trailer", label: "MAC Trailer" },
  { value: "load-king", label: "Load King" },
  { value: "trail-king", label: "Trail King" },
  { value: "east", label: "East" },
  { value: "ravens", label: "Ravens" },
  { value: "chaparral", label: "Chaparral" },
  { value: "beall", label: "Beall" },
].sort((a, b) => a.label.localeCompare(b.label));

// Marcas de vans/camionetas
export const VAN_BRANDS: BrandOption[] = [
  { value: "ford", label: "Ford", popular: true },
  { value: "chevrolet", label: "Chevrolet", popular: true },
  { value: "gmc", label: "GMC", popular: true },
  { value: "ram", label: "Ram", popular: true },
  { value: "nissan", label: "Nissan" },
  { value: "mercedes-benz", label: "Mercedes-Benz" },
  { value: "freightliner", label: "Freightliner" },
  { value: "isuzu", label: "Isuzu" },
  { value: "hino", label: "Hino" },
  { value: "mitsubishi-fuso", label: "Mitsubishi Fuso" },
].sort((a, b) => a.label.localeCompare(b.label));

// Marcas de automóviles
export const CAR_BRANDS: BrandOption[] = [
  { value: "ford", label: "Ford", popular: true },
  { value: "chevrolet", label: "Chevrolet", popular: true },
  { value: "toyota", label: "Toyota", popular: true },
  { value: "honda", label: "Honda", popular: true },
  { value: "nissan", label: "Nissan" },
  { value: "jeep", label: "Jeep" },
  { value: "gmc", label: "GMC" },
  { value: "ram", label: "Ram" },
  { value: "subaru", label: "Subaru" },
  { value: "mazda", label: "Mazda" },
  { value: "hyundai", label: "Hyundai" },
  { value: "kia", label: "Kia" },
  { value: "volkswagen", label: "Volkswagen" },
  { value: "bmw", label: "BMW" },
  { value: "mercedes-benz", label: "Mercedes-Benz" },
  { value: "audi", label: "Audi" },
  { value: "lexus", label: "Lexus" },
  { value: "acura", label: "Acura" },
  { value: "infiniti", label: "Infiniti" },
  { value: "cadillac", label: "Cadillac" },
].sort((a, b) => a.label.localeCompare(b.label));

// Función helper para obtener las marcas según el tipo de equipo
export const getBrandsByEquipmentType = (equipmentType: string): BrandOption[] => {
  switch (equipmentType) {
    case 'truck':
      return TRUCK_BRANDS;
    case 'trailer':
      return TRAILER_BRANDS;
    case 'van':
      return VAN_BRANDS;
    case 'car':
      return CAR_BRANDS;
    default:
      return [...TRUCK_BRANDS, ...TRAILER_BRANDS, ...VAN_BRANDS, ...CAR_BRANDS]
        .filter((brand, index, self) => 
          index === self.findIndex(b => b.value === brand.value)
        )
        .sort((a, b) => a.label.localeCompare(b.label));
  }
};

// Función para filtrar marcas basado en búsqueda
export const filterBrands = (brands: BrandOption[], search: string): BrandOption[] => {
  if (!search.trim()) return brands;
  
  const searchLower = search.toLowerCase();
  return brands.filter(brand => 
    brand.label.toLowerCase().includes(searchLower)
  );
};

// Función para crear una opción personalizada
export const createCustomBrandOption = (customBrand: string): BrandOption => ({
  value: customBrand.toLowerCase().replace(/\s+/g, '-'),
  label: customBrand,
  popular: false
});