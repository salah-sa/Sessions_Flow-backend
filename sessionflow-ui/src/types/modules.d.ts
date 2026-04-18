declare module "react-simple-maps" {
  import * as React from "react";

  export interface ComposableMapProps extends React.SVGAttributes<SVGSVGElement> {
    projection?: string | Function;
    projectionConfig?: object;
    width?: number;
    height?: number;
  }

  export interface GeographiesProps {
    geography: string | object | string[];
    children: (data: { geographies: any[] }) => React.ReactNode;
    parseGeographies?: (geos: any[]) => any[];
  }

  export interface GeographyProps extends React.SVGAttributes<SVGPathElement> {
    geography: object;
  }

  export interface MarkerProps extends React.SVGAttributes<SVGGElement> {
    coordinates: [number, number];
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
  export const Marker: React.FC<MarkerProps>;
  export const ZoomableGroup: React.FC<any>;
}
