import React, { useEffect, useState } from 'react';

interface InPostMapProps {
  onPointSelect: (pointName: string, pointAddress: string) => void;
}

export const InPostMap: React.FC<InPostMapProps> = ({ onPointSelect }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Ładowanie stylów InPostu
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://geowidget.inpost.pl/cms/assets/v2/geowidget.css';
    document.head.appendChild(link);

    // Ładowanie skryptu InPostu
    const script = document.createElement('script');
    script.src = 'https://geowidget.inpost.pl/cms/assets/v2/geowidget.js';
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);

    // Nasłuchiwanie na kliknięcie paczkomatu
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'InpostGeowidget' && e.data.action === 'selectPoint') {
        const pointName = e.data.value.name; // np. "POL01M"
        const pointAddress = `${e.data.value.address.line1}, ${e.data.value.address.line2}`;
        onPointSelect(pointName, pointAddress);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
      window.removeEventListener('message', handleMessage);
    };
  }, [onPointSelect]);

  // Na localhost wpisujesz testowo "paczkomaty". 
  // Jak wrzucisz stronę na produkcję, zmienisz to na wygenerowany token dla Twojej domeny.
  const geoWidgetToken = "paczkomaty"; 

  return (
    <div style={{ width: '100%', height: '450px', marginTop: '15px' }}>
      {loaded ? (
        <div
          dangerouslySetInnerHTML={{
            __html: `<inpost-geowidget token="${geoWidgetToken}" language="pl" config="parcelcollect"></inpost-geowidget>`
          }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Ładowanie mapy Paczkomatów...
        </div>
      )}
    </div>
  );
};