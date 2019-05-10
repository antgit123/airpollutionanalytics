import fiona
from shapely import geometry

def get_LGA(point, location,year):

    for loc in location:
        bounds = location[loc]['bounds']
        properties = location[loc]['properties']
        xmin = bounds[1]
        xmax = bounds[3]
        if point.x > xmin and point.x < xmax:
            ymin = bounds[0]
            ymax = bounds[2]
            if point.y > ymin and point.y < ymax:
                if year == '2015':
                    return properties['lga_code']
                else:
                    return properties['lga_code16']
    return None

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