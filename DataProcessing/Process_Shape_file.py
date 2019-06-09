import fiona
from shapely import geometry

# function to get information of region
def get_LGA(point, location,year):
    for loc in location:
        properties = location[loc]['properties']
        shape_polygon = shape(location[loc]['geometry'])
        if point.within(shape_polygon):
            if year == '2015' or year == '2016':
                return properties['lga_code']
            else:
                return properties['lga_code16']
    return None

# function to get boundary box for the regions
def get_LGA_dict(shapefile, year):
    location = {}
    with fiona.open(shapefile) as collection:
        for shapefile_record in collection:
            shape = geometry.asShape( shapefile_record['geometry'] )

            minx, miny, maxx, maxy = shape.bounds
            bounding_box = geometry.box(minx, miny, maxx, maxy)
            if year == '201415':
                location[shapefile_record['properties']['lga_code']] = {'boundbox': bounding_box,
                                                                    'bounds':(minx,miny,maxx,maxy),
                                                'properties':shapefile_record['properties'],
                                                'geometry':shapefile_record['geometry']}
            else:
                location[shapefile_record['properties']['lga_code16']] = {'boundbox': bounding_box,
                                                                        'bounds': (minx, miny, maxx, maxy),
                                                                        'properties': shapefile_record['properties'],
                                                                        'geometry': shapefile_record['geometry']}

    return location