const waypoints = [
    {
        from: 'New York JFK',
        to: 'Rome',
        speed: 70000,
        mode: 'FLYING'
    },
    '5481288261_e4bb6b2aa3_o.jpg',
    '8609333271_1ebb9aa95a_o.jpg',
    {
        from: 'Rome, Italy',
        waypoints: [
            { location: 'Florence, Italy' }
        ],
        to: 'Pisa, Italy'
    },
    'https://farm2.staticflickr.com/1066/526003792_b17d76799d_o_d.jpg'
];

MapGallery.initialize(waypoints);
