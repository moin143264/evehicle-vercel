const express = require('express');
const router = express.Router();
const { 
  addStation, 
  getAllStations, 
  getStationsWithin10Km, 
  deleteStation 
} = require('../controllers/stationController');

router.post('/add', addStation);
router.get('/all', getAllStations);
// In your routes file (stationRoutes.js)
router.get('/all', async (req, res) => {
  try {
    console.log('Attempting to fetch all stations');
    const stations = await Station.find();
    console.log('Found stations:', stations);
    
    if (!stations || stations.length === 0) {
      console.log('No stations found in database');
      return res.json([]);
    }

    const formattedStations = stations.map(station => ({
      _id: station._id,
      name: station.name,
      address: station.address,
      numChargers: station.numChargers || 0,
      type: station.type || 'Regular',
      latitude: station.latitude,
      longitude: station.longitude,
      pricePerHour: station.pricePerHour || 0
    }));

    console.log('Sending formatted stations:', formattedStations);
    return res.json(formattedStations);
    
  } catch (error) {
    console.error('Error in /all route:', error);
    return res.status(500).json({ 
      message: 'Error fetching stations',
      error: error.message 
    });
  }
});
router.get('/nearby', getStationsWithin10Km);
router.delete('/:id', deleteStation);

module.exports = router;