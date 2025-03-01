let isMapInitialized = false;
        let locationInterval = null;
        const LOCATION_UPDATE_INTERVAL = 60000; // 1 minute

        function showPopup(message) {
            const popupOverlay = document.getElementById('popup-overlay');
            const popupMessage = document.getElementById('popup-message');
            popupMessage.textContent = message;
            popupOverlay.classList.add('active');
        }

        function hidePopup() {
            const popupOverlay = document.getElementById('popup-overlay');
            popupOverlay.classList.remove('active');
        }

        document.getElementById('popup-close-btn').addEventListener('click', hidePopup);

        // Your Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDxmmnQMTfoTBGarz65NdHm1t3NyxWM-rE",
            authDomain: "soapp-80936.firebaseapp.com",
            projectId: "soapp-80936",
            storageBucket: "soapp-80936.firebasestorage.app",
            messagingSenderId: "152328551150",
            appId: "1:152328551150:web:211ab46d98e41560d1d1ff",
            measurementId: "G-2ZVT8KSKHR"
        };

        // Initialize Firebase
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();
        const functions = firebase.functions();

        let map;
        let directionsService;
        let directionsRenderer;
        let currentLocationMarker;

        function initMap() {
            if (!window.google || !window.google.maps) {
                showPopup('Google Maps API failed to load. Please refresh the page.');
                return;
            }

            const defaultLocation = { lat: -34.397, lng: 150.644 };

            map = new google.maps.Map(document.getElementById('map'), {
                zoom: 15,
                center: defaultLocation,
                styles: [
                { "featureType": "all", "elementType": "geometry", "stylers": [{"color": "#1A1A1A"}] }, // Slightly lighter black for depth
            // Thin, light gray roads
            { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#B0B0B0"}, {"weight": 0.5}] },
            // Subtle blue-gray water
            { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#1DA1F2"}] },
            // Muted landscape matching background
            { "featureType": "landscape", "elementType": "geometry", "stylers": [{"color": "#1A1A1A"}] },
            // Muted POIs
            { "featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#333333"}] },
            // Thin, white labels with no stroke
            { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{"color": "#FFFFFF"}, {"weight": "0.5"}] },
            { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{"visibility": "off"}] }
                ]
            });

            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                polylineOptions: { strokeColor: "#000000", strokeWeight: 4, strokeOpacity: 1.0 }
            });

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                        map.setCenter(userLocation);
                        currentLocationMarker = new google.maps.Marker({
                            position: userLocation,
                            map: map,
                            title: 'Your Location',
                            icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
                        });
                        document.getElementById('start-location').value = `${userLocation.lat}, ${userLocation.lng}`;
                        isMapInitialized = true;
                        document.querySelector('.route-btn').disabled = false;
                        document.getElementById('current-location-btn').disabled = false;
                    },
                    (error) => {
                        let errorMessage = 'Unable to retrieve your location.';
                        switch (error.code) {
                            case error.PERMISSION_DENIED: errorMessage = 'Location permission denied.'; break;
                            case error.POSITION_UNAVAILABLE: errorMessage = 'Location unavailable.'; break;
                            case error.TIMEOUT: errorMessage = 'Location request timed out.'; break;
                        }
                        showPopup(errorMessage);
                        map.setCenter(defaultLocation);
                        isMapInitialized = true;
                        document.querySelector('.route-btn').disabled = false;
                        document.getElementById('current-location-btn').disabled = false;
                    }
                );
            } else {
                showPopup('Geolocation not supported.');
                map.setCenter(defaultLocation);
                isMapInitialized = true;
                document.querySelector('.route-btn').disabled = false;
                document.getElementById('current-location-btn').disabled = false;
            }
        }

        function setCurrentLocation() {
            if (!isMapInitialized || !map || !window.google || !window.google.maps) {
                showPopup('Map not initialized yet.');
                return;
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                        map.setCenter(userLocation);
                        if (currentLocationMarker) currentLocationMarker.setMap(null);
                        currentLocationMarker = new google.maps.Marker({
                            position: userLocation,
                            map: map,
                            title: 'Your Location',
                            icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
                        });
                        document.getElementById('start-location').value = `${userLocation.lat}, ${userLocation.lng}`;
                    },
                    (error) => {
                        let errorMessage = 'Unable to retrieve your location.';
                        switch (error.code) {
                            case error.PERMISSION_DENIED: errorMessage = 'Location permission denied.'; break;
                            case error.POSITION_UNAVAILABLE: errorMessage = 'Location unavailable.'; break;
                            case error.TIMEOUT: errorMessage = 'Location request timed out.'; break;
                        }
                        showPopup(errorMessage);
                    }
                );
            } else {
                showPopup('Geolocation not supported.');
            }
        }

        function calculateSafeRoute() {
            if (!isMapInitialized || !window.google || !window.google.maps || !directionsService || !directionsRenderer) {
                showPopup('Google Maps API not loaded.');
                return;
            }

            const start = document.getElementById('start-location').value;
            const end = document.getElementById('end-location').value;

            if (!start || !end) {
                showPopup('Enter both start and end locations.');
                return;
            }

            directionsService.route({
                origin: start,
                destination: end,
                travelMode: google.maps.TravelMode.WALKING
            }, (response, status) => {
                if (status === 'OK') {
                    directionsRenderer.setDirections(response);
                    const steps = response.routes[0].legs[0].steps.map(step => step.instructions).join('<br>');
                    document.getElementById('route-steps').innerHTML = steps;
                    document.getElementById('route-instructions').style.display = 'block';
                    showPopup('Route calculated successfully!');
                } else {
                    showPopup('Directions request failed: ' + status);
                }
            });
        }

        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
                page.style.opacity = '0';
            });
            const targetPage = document.getElementById(pageId);
            targetPage.classList.add('active');
            setTimeout(() => targetPage.style.opacity = '1', 50);
            updateNav(pageId);
        }

        function updateNav(pageId) {
            document.querySelectorAll('nav button').forEach(button => {
                button.classList.remove('active');
                if (button.getAttribute('onclick') === `showPage('${pageId}')`) button.classList.add('active');
            });
        }

        function transitionToMapPage(card) {
            const body = document.body;
            body.classList.add('fade-out-except-enlarging', 'active');
            card.classList.add('enlarging');

            setTimeout(() => {
                card.classList.remove('enlarging');
                body.classList.remove('active', 'fade-out-except-enlarging');
                showPage('map-page');
            }, 500);
        }

        function triggerFakeCall() {
            showPopup('Fake Call Activated! (Sound not implemented)');
        }

        function getCurrentLocation(callback) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const location = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            timestamp: new Date().toISOString()
                        };
                        callback(location);
                    },
                    (error) => showPopup('Failed to get location: ' + error.message)
                );
            } else {
                showPopup('Geolocation not supported.');
            }
        }

        function shareLocation() {
            const user = auth.currentUser;
            if (!user) {
                showPopup('Please sign in to share your location.');
                return;
            }

            getCurrentLocation((location) => {
                const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
                db.collection('locationShares').doc(user.uid).set({
                    location: location,
                    sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    active: true
                }).then(() => {
                    db.collection('users').doc(user.uid).get().then((doc) => {
                        if (doc.exists) {
                            const emergencyContact = doc.data().emergencyContact;
                            sendNotification(emergencyContact, locationUrl);
                        } else {
                            showPopup('Emergency contact not found.');
                        }
                    }).catch((error) => showPopup('Error fetching user data: ' + error.message));
                }).catch((error) => showPopup('Error sharing location: ' + error.message));
            });
        }

        function sendNotification(contact, locationUrl) {
            const sendMessage = functions.httpsCallable('sendEmergencyMessage');
            sendMessage({
                contact: contact,
                message: `Emergency: User location at ${new Date().toLocaleString()}: ${locationUrl}`
            })
            .then((result) => {
                showPopup('Location shared with emergency contact!');
                console.log('Notification result:', result);
            })
            .catch((error) => {
                showPopup('Error sending notification: ' + error.message);
                console.error('Notification error:', error);
            });
        }

        function toggleLocationSharing(isEnabled) {
            if (isEnabled) {
                shareLocation(); // Send initial location immediately
                locationInterval = setInterval(shareLocation, LOCATION_UPDATE_INTERVAL); // Then every 1 minute
            } else {
                clearInterval(locationInterval);
                locationInterval = null;
                if (auth.currentUser) {
                    db.collection('locationShares').doc(auth.currentUser.uid).update({ active: false })
                        .then(() => showPopup('Location sharing stopped.'))
                        .catch((error) => showPopup('Error stopping location sharing: ' + error.message));
                }
            }
        }

        document.querySelector('.sos-btn').addEventListener('click', () => {
            showPopup('SOS Alert Sent! Starting location sharing...');
            if (!locationInterval) toggleLocationSharing(true);
        });

        function signUp() {
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const emergencyContact = document.getElementById('signup-emergency-contact').value;

            if (!name || !email || !password || !emergencyContact) {
                showPopup('Please fill in all fields.');
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return db.collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        emergencyContact: emergencyContact,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    showPage('home');
                    document.getElementById('navbar').style.display = 'flex';
                })
                .catch((error) => {
                    showPopup('Sign Up Error: ' + error.message);
                    console.error('Sign-up error:', error);
                });
        }

        function signIn() {
            const email = document.getElementById('signin-email').value;
            const password = document.getElementById('signin-password').value;

            if (!email || !password) {
                showPopup('Please fill in all fields.');
                return;
            }

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    showPage('home');
                    document.getElementById('navbar').style.display = 'flex';
                    loadUserProfile(userCredential.user.uid);
                })
                .catch((error) => {
                    showPopup('Sign In Error: ' + error.message);
                    console.error('Sign-in error:', error);
                });
        }

        function loadUserProfile(userId) {
            db.collection('users').doc(userId).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        document.getElementById('profile-name').textContent = userData.name;
                        document.getElementById('profile-email').textContent = 'Email: ' + userData.email;
                        document.getElementById('profile-emergency').textContent = 'Emergency Contact: ' + userData.emergencyContact;
                        document.getElementById('edit-name').value = userData.name;
                        document.getElementById('edit-emergency').value = userData.emergencyContact;
                    } else {
                        showPopup('No profile data found.');
                    }
                }).catch((error) => showPopup('Error loading profile: ' + error.message));
        }

        function toggleEditProfile() {
            const editForm = document.getElementById('edit-profile-form');
            if (editForm.style.display === 'none') {
                editForm.style.display = 'block';
                document.getElementById('edit-profile-btn').textContent = 'Cancel';
            } else {
                editForm.style.display = 'none';
                document.getElementById('edit-profile-btn').textContent = 'Edit Profile';
            }
        }

        function updateProfile() {
            const userId = auth.currentUser.uid;
            const name = document.getElementById('edit-name').value;
            const emergencyContact = document.getElementById('edit-emergency').value;

            if (!name || !emergencyContact) {
                showPopup('Please fill in all fields.');
                return;
            }

            db.collection('users').doc(userId).update({
                name: name,
                emergencyContact: emergencyContact
            })
            .then(() => {
                showPopup('Profile updated!');
                loadUserProfile(userId);
                toggleEditProfile();
            })
            .catch((error) => showPopup('Error updating profile: ' + error.message));
        }

        function signOut() {
            if (locationInterval) toggleLocationSharing(false);
            auth.signOut()
                .then(() => {
                    showPopup('Signed out successfully!');
                    document.getElementById('navbar').style.display = 'none';
                    showPage('signin');
                })
                .catch((error) => showPopup('Error signing out: ' + error.message));
        }

        auth.onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('navbar').style.display = 'flex';
                showPage('home');
                loadUserProfile(user.uid);
                db.collection('locationShares').doc(user.uid).get().then((doc) => {
                    if (doc.exists && doc.data().active) {
                        document.getElementById('share-location').checked = true;
                        toggleLocationSharing(true);
                    }
                });
            } else {
                document.getElementById('navbar').style.display = 'none';
                showPage('signin');
                if (locationInterval) toggleLocationSharing(false);
            }
        });

        window.onload = function() {
            setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 2500);
        };
    </script>
