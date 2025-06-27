import React, { useState } from 'react';
import { Search, MapPin, Star, Phone, Globe, ExternalLink, Filter, Loader, Download } from 'lucide-react';

const StarRating = ({ rating }) => {
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
      <span className="text-sm text-gray-600 ml-1">({rating.toFixed(1)})</span>
    </div>
  );
};

function App() {
  const [keyword, setKeyword] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const apiKey = process.env.REACT_APP_GOOGLE_PLACES_API_KEY;

  const geocodeZipCode = async (zipCode) => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google Maps no está cargado. Verifica tu API Key.'));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      const queries = [
        zipCode,
        `${zipCode}, España`,
        `${zipCode}, Spain`,
        `CP ${zipCode}, España`
      ];

      const tryGeocode = (index = 0) => {
        if (index >= queries.length) {
          reject(new Error('No se pudo encontrar la ubicación del código postal. Verifica que sea un código postal válido.'));
          return;
        }

        geocoder.geocode({ address: queries[index] }, (results, status) => {
          if (status === 'OK' && results.length > 0) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            tryGeocode(index + 1);
          }
        });
      };

      tryGeocode();
    });
  };

  const searchPlaces = async (keyword, location) => {
    return new Promise((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google Maps no está cargado. Verifica tu API Key.'));
        return;
      }

      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      const request = {
        query: keyword,
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 10000
      };

      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          console.log('Resultados crudos de Places API:', results); // Debug
          
          // Procesar cada lugar para obtener detalles adicionales
          let processedCount = 0;
          const businesses = [];
          const totalPlaces = Math.min(results.length, 20);
          
          if (totalPlaces === 0) {
            resolve([]);
            return;
          }
          
          results.slice(0, 20).forEach((place, index) => {
            // Obtener detalles adicionales para cada lugar
            const detailsRequest = {
              placeId: place.place_id,
              fields: [
                'formatted_phone_number', 
                'international_phone_number',
                'website', 
                'url',
                'name',
                'formatted_address'
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
                  rating: place.rating || 0,
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
    
    if (!keyword.trim() || !zipCode.trim()) {
      setError('Por favor ingresa tanto la palabra clave como el código postal');
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
      console.log('Geocodificando código postal:', zipCode.trim());
      const location = await geocodeZipCode(zipCode.trim());
      console.log('Ubicación encontrada:', location);
      
      console.log('Buscando lugares para:', keyword.trim());
      const results = await searchPlaces(keyword.trim(), location);
      console.log('Resultados encontrados:', results.length);
      console.log('Muestra de resultados con teléfonos y webs:', results.slice(0, 3));
      
      setBusinesses(results);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
      ['Nombre', 'Dirección', 'Teléfono', 'Sitio Web', 'Calificación', 'Google Maps URL'],
      // Data rows
      ...filteredBusinesses.map(business => [
        business.name,
        business.address,
        business.phone || 'No disponible',
        business.website || 'No disponible',
        business.rating || 'Sin calificación',
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
              <strong>API Real:</strong> Usando Google Places API. Busca cualquier negocio con códigos postales reales.
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label htmlFor="zipcode" className="block text-sm font-medium text-gray-700 mb-2">
                  Código postal
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="zipcode"
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Ej: 28001, 08001..."
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                          <StarRating rating={business.rating} />
                        ) : (
                          <span className="text-sm text-gray-500">Sin calificación</span>
                        )}
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
                  
                  {business.rating > 0 && (
                    <StarRating rating={business.rating} />
                  )}
                  
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