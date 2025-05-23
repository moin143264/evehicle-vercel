const Station = require('../models/Station');

exports.addStation = async (req, res) => {
  try {
    const stationData = req.body;
    
    // Validate required fields
    if (!stationData.name || !stationData.address || !stationData.chargingPoints || stationData.chargingPoints.length === 0) {
      return res.status(400).json({ 
        message: 'Missing required fields. Name, address and at least one charging point are required.' 
      });
    }

    // Create new station
    const newStation = new Station(stationData);
    await newStation.save();

    res.status(201).json({
      message: 'Station added successfully!',
      station: newStation
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error adding station',
      error: error.message
    });
  }
};

exports.getAllStations = async (req, res) => {
  try {
      const stations = await Station.find().populate('chargingPoints');
      res.status(200).json(stations);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching stations', error: error.message });
  }
};

exports.getStationsWithin10Km = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const stations = await Station.find();
    
    // Calculate distance and filter stations (using the Haversine formula)
    const nearbyStations = stations.filter(station => {
      const R = 6371; // Earth's radius in km
      const lat1 = parseFloat(latitude);
      const lon1 = parseFloat(longitude);
      const lat2 = parseFloat(station.location.latitude);
      const lon2 = parseFloat(station.location.longitude);
      
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance <= 10; // Return stations within 10km
    });

    res.status(200).json(nearbyStations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching nearby stations', error: error.message });
  }
};

exports.deleteStation = async (req, res) => {
  try {
    const stationId = req.params.id;
    const station = await Station.findByIdAndDelete(stationId);
    
    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }
    
    res.status(200).json({ message: 'Station deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting station', error: error.message });
  }
};