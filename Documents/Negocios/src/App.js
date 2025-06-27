import React, { useState } from 'react';
import { Search, MapPin, Star, Phone, Globe, ExternalLink, Filter, Loader, Download, Clock, DollarSign, Tag } from 'lucide-react';

const StarRating = ({ rating, reviewCount }) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <div key={i} className="relative w-3.5 h-3.5">
          <Star className="absolute w-3.5 h-3.5 text-gray-300" />
          <div className="absolute overflow-hidden w-1/2">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    } else {
      stars.push(<Star key={i} className="w-3.5 h-3.5 text-gray-300" />);
    }
  }
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">{stars}</div>
      <div className="ml-1 text-sm text-gray-600">
        <span>({rating.toFixed(1)})</span>
        {reviewCount > 0 && (
          <span className="ml-1 text-xs text-gray-500">
            {reviewCount} reseña{reviewCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

const PriceLevel = ({ level }) => {
  if (!level) return null;
  
  const dollars = [];
  for (let i = 0; i < 4; i++) {
    dollars.push(
      <DollarSign 
        key={i} 
        className={`w-3 h-3 ${i < level ? 'text-green-600' : 'text-gray-300'}`}
      />
    );
  }
  
  return (
    <div className="flex items-center" title={`Nivel de precios: ${level}/4`}>
      {dollars}
    </div>
  );
};

const OpenStatus = ({ isOpen }) => {
  if (isOpen === null) return null;
  
  return (
    <div className={`flex items-center gap-1 text-xs ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
      <Clock className="w-3 h-3" />
      <span>{isOpen ? 'Abierto' : 'Cerrado'}</span>
    </div>
  );
};

function App() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState('zipcode');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const apiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;

  const geocodeLocation = async (locationInput, type) => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google Maps no está cargado. Verifica tu API Key.'));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      let queries = [];

      switch (type) {
        case 'zipcode':
          queries = [
            locationInput,
            `${locationInput}, España`,
            `${locationInput}, Spain`,
            `CP ${locationInput}, España`,
            `${locationInput}, México`,
            `${locationInput}, USA`
          ];
          break;
        case 'address':
          queries = [
            locationInput,
            `${locationInput}, España`,
            `${locationInput}, Spain`
          ];
          break;
        case 'city':
          queries = [
            `${locationInput}, España`,
            `${locationInput}, Spain`,
            `${locationInput}, México`,
            `${locationInput}, USA`,
            locationInput
          ];
          break;
        case 'state':
          queries = [
            `${locationInput}, España`,
            `${locationInput}, Spain`,
            `${locationInput}, México`,
            `${locationInput}, USA`,
            locationInput
          ];
          break;
        case 'country':
          queries = [locationInput];
          break;
        default:
          queries = [locationInput];
      }

      const tryGeocode = (index = 0) => {
        if (index >= queries.length) {
          reject(new Error(`No se pudo encontrar la ubicación "${locationInput}". Verifica que sea una ubicación válida.`));
          return;
        }

        geocoder.geocode({ address: queries[index] }, (results, status) => {
          if (status === 'OK' && results.length > 0) {
            const location = results[0].geometry.location;
            const result = {
              lat: location.lat(),
              lng: location.lng(),
              formatted_address: results[0].formatted_address,
              place_id: results[0].place_id
            };
            console.log(`Ubicación geocodificada: ${queries[index]} -> ${result.formatted_address}`);
            resolve(result);
          } else {
            tryGeocode(index + 1);
          }
        });
      };

      tryGeocode();
    });
  };

  const searchPlaces = async (keyword, locationData, locationType) => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google Maps no está cargado. Verifica tu API Key.'));
        return;
      }

      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      // Ajustar radio según el tipo de ubicación
      let radius;
      switch (locationType) {
        case 'zipcode':
        case 'address':
          radius = 10000; // 10km para código postal o dirección específica
          break;
        case 'city':
          radius = 25000; // 25km para ciudad
          break;
        case 'state':
          radius = 100000; // 100km para estado/provincia
          break;
        case 'country':
          radius = 200000; // 200km para país (máximo permitido)
          break;
        default:
          radius = 10000;
      }

      const request = {
        query: keyword,
        location: new window.google.maps.LatLng(locationData.lat, locationData.lng),
        radius: radius
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          console.log('Resultados crudos de Places API:', results); // Debug
          
          // Procesar cada lugar para obtener detalles adicionales
          let processedCount = 0;
          const businesses = [];
          const totalPlaces = Math.min(results.length, 50);
          
          if (totalPlaces === 0) {
            resolve([]);
            return;
          }
          
          results.slice(0, 50).forEach((place, index) => {
            // Obtener detalles adicionales para cada lugar
            const detailsRequest = {
              placeId: place.place_id,
              fields: [
                'formatted_phone_number', 
                'international_phone_number',
                'website', 
                'url',
                'name',
                'formatted_address',
                'user_ratings_total',
                'rating',
                'opening_hours',
                'price_level',
                'types'
              ]
            };
            
            service.getDetails(detailsRequest, (placeDetails, detailsStatus) => {
              let business;
              
              if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                business = {
                  id: place.place_id,
                  name: placeDetails.name || place.name,
                  address: placeDetails.formatted_address || place.formatted_address,
                  website: placeDetails.website || '',
                  phone: placeDetails.formatted_phone_number || placeDetails.international_phone_number || '',
                  rating: placeDetails.rating || place.rating || 0,
                  reviewCount: placeDetails.user_ratings_total || 0,
                  priceLevel: placeDetails.price_level || null,
                  isOpen: placeDetails.opening_hours?.open_now || null,
                  types: placeDetails.types || place.types || [],
                  mapsUrl: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
                };
                console.log(`Detalles obtenidos para ${business.name}:`, {
                  phone: business.phone,
                  website: business.website,
                  originalPlace: place
                });
              } else {
                // Si falla obtener detalles, usar datos básicos
                business = {
                  id: place.place_id,
                  name: place.name,
                  address: place.formatted_address,
                  website: '',
                  phone: '',
                  rating: place.rating || 0,
                  reviewCount: place.user_ratings_total || 0,
                  priceLevel: place.price_level || null,
                  isOpen: null,
                  types: place.types || [],
                  mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
                };
                console.log(`Falló obtener detalles para ${business.name}, usando datos básicos`);
              }
              
              businesses[index] = business;
              processedCount++;
              
              // Cuando todos los lugares han sido procesados
              if (processedCount === totalPlaces) {
                const sortedBusinesses = businesses.filter(b => b); // Remover elementos undefined
                console.log('Todos los negocios procesados:', sortedBusinesses);
                resolve(sortedBusinesses);
              }
            });
          });
        } else {
          reject(new Error(`Error en la búsqueda: ${status}`));
        }
      });
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!keyword.trim() || !location.trim()) {
      setError('Por favor ingresa tanto la palabra clave como la ubicación');
      return;
    }
    
    if (!apiKey || apiKey === 'tu_api_key_aqui') {
      setError('Por favor configura tu API Key real de Google Places en el archivo .env');
      return;
    }
    
    if (!window.google) {
      setError('Google Maps no se ha cargado correctamente. Verifica tu API Key y conexión a internet.');
      return;
    }
    
    setLoading(true);
    setError('');
    setBusinesses([]);
    
    try {
      console.log(`Geocodificando ${locationType}:`, location.trim());
      const locationData = await geocodeLocation(location.trim(), locationType);
      console.log('Ubicación encontrada:', locationData);
      
      console.log(`Buscando lugares para "${keyword.trim()}" en radio de ${getRadiusText(locationType)}`);
      const results = await searchPlaces(keyword.trim(), locationData, locationType);
      console.log('Resultados encontrados:', results.length);
      console.log('Muestra de resultados:', results.slice(0, 3));
      
      setBusinesses(results);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRadiusText = (type) => {
    switch (type) {
      case 'zipcode':
      case 'address':
        return '10km';
      case 'city':
        return '25km';
      case 'state':
        return '100km';
      case 'country':
        return '200km';
      default:
        return '10km';
    }
  };

  const getLocationPlaceholder = (type) => {
    switch (type) {
      case 'zipcode':
        return 'Ej: 28001, 08001, 46001...';
      case 'address':
        return 'Ej: Calle Gran Vía 123, Madrid';
      case 'city':
        return 'Ej: Madrid, Barcelona, Valencia...';
      case 'state':
        return 'Ej: Comunidad de Madrid, Cataluña...';
      case 'country':
        return 'Ej: España, México, Estados Unidos...';
      default:
        return 'Ingresa una ubicación...';
    }
  };

  const getLocationTypeLabel = (type) => {
    switch (type) {
      case 'zipcode':
        return 'Código Postal';
      case 'address':
        return 'Dirección Específica';
      case 'city':
        return 'Ciudad';
      case 'state':
        return 'Estado/Provincia';
      case 'country':
        return 'País';
      default:
        return 'Ubicación';
    }
  };

  const getLocationDescription = (type) => {
    switch (type) {
      case 'zipcode':
        return 'Búsqueda precisa en un área específica de código postal';
      case 'address':
        return 'Búsqueda en los alrededores de una dirección específica';
      case 'city':
        return 'Búsqueda amplia en toda una ciudad y sus alrededores';
      case 'state':
        return 'Búsqueda muy amplia en toda una provincia o estado';
      case 'country':
        return 'Búsqueda máxima en un área extensa del país';
      default:
        return '';
    }
  };

  const filteredBusinesses = businesses.filter(business => {
    const matchesName = business.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesRating = (() => {
      switch (ratingFilter) {
        case '4+': return business.rating >= 4;
        case '3.5+': return business.rating >= 3.5;
        case '3+': return business.rating >= 3;
        default: return true;
      }
    })();
    
    return matchesName && matchesRating;
  });

  const exportToCSV = () => {
    const csvContent = [
      // Header
      ['Nombre', 'Dirección', 'Teléfono', 'Sitio Web', 'Calificación', 'Número de Reseñas', 'Nivel de Precios', 'Estado (Abierto/Cerrado)', 'Tipos', 'Google Maps URL'],
      // Data rows
      ...filteredBusinesses.map(business => [
        business.name,
        business.address,
        business.phone || 'No disponible',
        business.website || 'No disponible',
        business.rating || 'Sin calificación',
        business.reviewCount || 0,
        business.priceLevel ? `${business.priceLevel}/4` : 'No disponible',
        business.isOpen === null ? 'No disponible' : (business.isOpen ? 'Abierto' : 'Cerrado'),
        business.types ? business.types.slice(0, 3).join(', ') : 'No disponible',
        business.mapsUrl
      ])
    ];
    
    const csvString = csvContent
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `negocios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Buscador de Negocios</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API Status Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-green-800 text-sm">
              <strong>API Real:</strong> Búsqueda flexible por código postal, dirección, ciudad, estado o país. Hasta 50 resultados con información completa.
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="relative">
                <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
                  Palabra clave
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="keyword"
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Ej: restaurante, dentista, tienda..."
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="relative">
                <label htmlFor="location-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de ubicación
                </label>
                <select
                  id="location-type"
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="zipcode">Código Postal</option>
                  <option value="address">Dirección Específica</option>
                  <option value="city">Ciudad</option>
                  <option value="state">Estado/Provincia</option>
                  <option value="country">País</option>
                </select>
              </div>
              
              <div className="relative">
                <label htmlFor="location" className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Ubicación
                  <span className="ml-1 text-xs text-gray-500">
                    (Radio: {getRadiusText(locationType)})
                  </span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={getLocationPlaceholder(locationType)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Search Type Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-800">
                <strong>Tipo seleccionado: {getLocationTypeLabel(locationType)}</strong>
                <span className="ml-2">Radio de búsqueda: {getRadiusText(locationType)}</span>
                <div className="mt-1 text-blue-600">
                  {getLocationDescription(locationType)}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        {businesses.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors duration-200"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            
            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nameFilter" className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por nombre
                  </label>
                  <input
                    id="nameFilter"
                    type="text"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label htmlFor="ratingFilter" className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por calificación
                  </label>
                  <select
                    id="ratingFilter"
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas las calificaciones</option>
                    <option value="4+">4+ estrellas</option>
                    <option value="3.5+">3.5+ estrellas</option>
                    <option value="3+">3+ estrellas</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {filteredBusinesses.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Resultados ({filteredBusinesses.length})
              </h2>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
            
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sitio Web
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Calificación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Info Adicional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Google Maps
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{business.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{business.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {business.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-900">{business.phone}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No disponible</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {business.website ? (
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                          >
                            <Globe className="w-3 h-3" />
                            Visitar
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">No disponible</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {business.rating > 0 ? (
                          <StarRating rating={business.rating} reviewCount={business.reviewCount} />
                        ) : (
                          <span className="text-sm text-gray-500">Sin calificación</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <PriceLevel level={business.priceLevel} />
                          <OpenStatus isOpen={business.isOpen} />
                          {business.types && business.types.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 truncate max-w-20" title={business.types.slice(0, 3).join(', ')}>
                                {business.types[0]?.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={business.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                        >
                          <MapPin className="w-3 h-3" />
                          Ver
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {filteredBusinesses.map((business) => (
                <div key={business.id} className="p-4 space-y-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{business.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{business.address}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {business.rating > 0 ? (
                      <StarRating rating={business.rating} reviewCount={business.reviewCount} />
                    ) : (
                      <span className="text-sm text-gray-500">Sin calificación</span>
                    )}
                    <div className="flex items-center gap-2">
                      <PriceLevel level={business.priceLevel} />
                      <OpenStatus isOpen={business.isOpen} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {business.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{business.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-300" />
                        <span className="text-sm text-gray-400">Teléfono no disponible</span>
                      </div>
                    )}
                    
                    {business.website ? (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                        >
                          Visitar sitio web
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-300" />
                        <span className="text-sm text-gray-400">Sitio web no disponible</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <a
                        href={business.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        Ver en Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    {business.types && business.types.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {business.types.slice(0, 2).map(type => type.replace(/_/g, ' ')).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {businesses.length > 0 && filteredBusinesses.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500">No se encontraron resultados con los filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;