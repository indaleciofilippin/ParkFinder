import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
// @ts-ignore
import ReactDOM from 'react-dom/client';

export const PROVIDER_DEFAULT = 'default';

// Elemento Marker que actúa como portador de propiedades para MapView
export const Marker = ({ children, coordinate, onPress }: any) => {
  return null;
};

// Función auxiliar para cargar Leaflet de manera dinámica en la web
const loadLeaflet = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).L) {
      resolve((window as any).L);
      return;
    }

    // Agregar estilos CSS de Leaflet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Agregar script de Leaflet
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve((window as any).L);
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(interval);
          resolve((window as any).L);
        }
      }, 100);
    }
  });
};

const MapView = ({ children, style, region, onPress }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [L, setL] = useState<any>(null);

  // Cargar recursos de Leaflet
  useEffect(() => {
    loadLeaflet()
      .then((leafletInstance) => {
        setL(leafletInstance);
      })
      .catch((err) => {
        console.error('Error al cargar Leaflet:', err);
      });
  }, []);

  // Inicializar mapa
  useEffect(() => {
    if (!L || !containerRef.current || mapInstanceRef.current) return;

    const initialLat = region?.latitude ?? -34.6037;
    const initialLng = region?.longitude ?? -58.3816;
    const initialZoom = 13;

    // Crear el mapa Leaflet
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([initialLat, initialLng], initialZoom);

    // Agregar capa de OpenStreetMap con estilo dark-mode elegante de CartoDB para wow factor
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Evento de click en el mapa
    map.on('click', () => {
      if (onPress) onPress();
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [L]);

  // Sincronizar región/coordenadas del mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !region) return;
    const { latitude, longitude } = region;
    mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
  }, [region?.latitude, region?.longitude]);

  // Sincronizar y renderizar marcadores de manera reactiva e interactiva
  useEffect(() => {
    if (!L || !mapInstanceRef.current) return;

    // Limpiar marcadores anteriores
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Procesar hijos (Markers)
    React.Children.forEach(children, (child: any) => {
      if (!child || !child.props) return;

      const { coordinate, onPress: onMarkerPress, children: markerContent } = child.props;
      if (!coordinate) return;

      let markerIcon;

      if (markerContent) {
        // Renderizar dinámicamente el contenido personalizado de React en un elemento DOM
        const customMarkerContainer = document.createElement('div');
        customMarkerContainer.style.background = 'transparent';
        const root = ReactDOM.createRoot(customMarkerContainer);
        root.render(markerContent);

        markerIcon = L.divIcon({
          html: customMarkerContainer,
          className: 'custom-leaflet-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      } else {
        // Icono predeterminado
        markerIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
      }

      const marker = L.marker([coordinate.latitude, coordinate.longitude], {
        icon: markerIcon,
      }).addTo(mapInstanceRef.current);

      if (onMarkerPress) {
        marker.on('click', (e: any) => {
          // Detener propagación para evitar disparar el click del mapa
          L.DomEvent.stopPropagation(e);
          onMarkerPress(e);
        });
      }

      markersRef.current.push(marker);
    });
  }, [children, L]);

  return (
    <div style={StyleSheet.flatten([styles.mapContainer, style])}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
    </div>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#0a0f24',
    overflow: 'hidden',
  },
});

export default MapView;

