// The QGIS import backlog (sql/0001_placemarks_needs_review.sql) left some
// placemarks stored as single-coordinate MultiPoint geometry. Mapbox's
// clustered GeoJSON source only indexes Point features via Supercluster —
// a MultiPoint mixed into the collection silently breaks clustering for the
// whole source (no error event, tiles just come back empty), which is what
// made pins vanish after panning into an area containing one.
export function toPointGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geometry.type === 'MultiPoint') {
    return { type: 'Point', coordinates: geometry.coordinates[0] };
  }
  return geometry;
}
