from math import sin, cos, sqrt, atan2, radians

# function to get the distance in kms between 2 coordinate points given as latitude and longitude
def calculateDistance(lat1, lon1, lat2, lon2):
    # approximate radius of earth in km
    radius = 6373.0

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    distancelon = lon2 - lon1
    distancelat = lat2 - lat1

    a = sin(distancelat / 2)**2 + cos(lat1) * cos(lat2) * sin(distancelon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = radius * c
    return distance
