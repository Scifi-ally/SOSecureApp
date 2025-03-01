let isMapInitialized = false;
        let locationInterval = null;
        const LOCATION_UPDATE_INTERVAL = 30000;

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

        const firebaseConfig = {
            apiKey: "AIzaSyDxmmnQMTfoTBGarz65NdHm1t3NyxWM-rE",
            authDomain: "soapp-80936.firebaseapp.com",
            projectId: "soapp-80936",
            storageBucket: "soapp-80936.firebasestorage.app",
            messagingSenderId: "152328551150",
            appId: "1:152328551150:web:211ab46d98e41560d1d1ff",
            measurementId: "G-2ZVT8KSKHR"
        };

        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();

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
                    { "featureType": "all", "elementType": "geometry", "stylers": [{"color": "#000000"}] },
                    { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#808080"}] },
                    { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#1DA1F2"}] },
                    { "featureType": "landscape", "elementType": "geometry", "stylers": [{"color": "#000000"}] },
                    { "featureType": "poi", "elementType": "geometry", "stylers": [{"color": "#000000"}] },
                    { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{"color": "#FFFFFF"}, {"weight": "0.5"}] },
                    { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{"color": "#000000"}, {"weight": "0.1"}] }
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
                document.querySelector('.route-btn mängung').disabled = false;
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

        function updateMapWithSharedLocation() {
            if (!isMapInitialized || !map) return;

            const user = auth.currentUser;
            if (user) {
                db.collection('locationShares').doc(user.uid).onSnapshot((doc) => {
                    if (doc.exists && doc.data().active) {
                        const { lat, lng } = doc.data().location;
                        const position = { lat, lng };
                        if (currentLocationMarker) currentLocationMarker.setMap(null);
                        currentLocationMarker = new google.maps.Marker({
                            position: position,
                            map: map,
                            title: 'Shared Location',
                            icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
                        });
                        map.setCenter(position);
                    }
                });
            }
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
            if (pageId === 'map-page' && !isMapInitialized) initMap();
            if (pageId === 'map-page') updateMapWithSharedLocation();
            if (pageId === 'community-page') loadCommunityPosts();
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
            }, 1000); // Reduced to 1 second
        }

        function transitionToCommunityPage(card) {
            const body = document.body;
            body.classList.add('fade-out-except-enlarging', 'active');
            card.classList.add('enlarging');

            setTimeout(() => {
                card.classList.remove('enlarging');
                body.classList.remove('active', 'fade-out-except-enlarging');
                showPage('community-page');
            }, 1000); // Reduced to 1 second
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

        function generateUniqueId() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function shareLocation() {
            const user = auth.currentUser;
            if (!user) {
                showPopup('Please sign in to share your location.');
                return;
            }

            getCurrentLocation((location) => {
                const locationUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
                const sosData = {
                    location: location,
                    sharedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    active: true,
                    userId: user.uid
                };

                db.collection('locationShares').doc(user.uid).set(sosData)
                    .then(() => {
                        db.collection('users').doc(user.uid).get().then((doc) => {
                            if (doc.exists) {
                                const userData = doc.data();
                                const emergencyContactIds = userData.emergencyContactIds || [];

                                db.collection('sosEvents').add({
                                    userId: user.uid,
                                    senderName: userData.name,
                                    location: location,
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                    active: true,
                                    emergencyContactIds: emergencyContactIds
                                }).then(() => {
                                    showPopup('SOS sent to linked emergency contacts!');
                                }).catch((error) => showPopup('Error logging SOS event: ' + error.message));
                            }
                        });
                    })
                    .catch((error) => showPopup('Error sharing location: ' + error.message));
            });
        }

        document.querySelector('.sos-btn').addEventListener('click', () => {
            showPopup('SOS Alert Sent to linked emergency contacts!');
            if (!locationInterval) {
                shareLocation();
                locationInterval = setInterval(shareLocation, LOCATION_UPDATE_INTERVAL);
                document.getElementById('stop-sharing-btn').style.display = 'block';
            }
        });

        function stopSharing() {
            if (locationInterval) {
                clearInterval(locationInterval);
                locationInterval = null;
                if (auth.currentUser) {
                    const userId = auth.currentUser.uid;
                    db.collection('locationShares').doc(userId).update({ active: false })
                        .then(() => {
                            db.collection('sosEvents')
                                .where('userId', '==', userId)
                                .where('active', '==', true)
                                .get()
                                .then((querySnapshot) => {
                                    const batch = db.batch();
                                    querySnapshot.forEach(doc => {
                                        batch.update(doc.ref, { active: false });
                                    });
                                    return batch.commit();
                                })
                                .then(() => showPopup('Location sharing stopped.'))
                                .catch((error) => showPopup('Error stopping SOS events: ' + error.message));
                        })
                        .catch((error) => showPopup('Error stopping sharing: ' + error.message));
                }
                document.getElementById('stop-sharing-btn').style.display = 'none';
            }
        }

        function signUp() {
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const emergencyContactsInput = document.getElementById('signup-emergency-contacts').value;

            if (!name || !email || !password || !emergencyContactsInput) {
                showPopup('Please fill in all fields.');
                return;
            }

            const emergencyContacts = emergencyContactsInput.split(',').map(contact => contact.trim());
            const phoneRegex = /^\+\d{9,15}$/;
            if (!emergencyContacts.every(contact => phoneRegex.test(contact))) {
                showPopup('Please enter valid phone numbers starting with + (e.g., +1234567890), separated by commas.');
                return;
            }

            const uniqueId = generateUniqueId();

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return db.collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        emergencyContacts: emergencyContacts,
                        uniqueId: uniqueId,
                        emergencyContactIds: [],
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
                        document.getElementById('profile-emergency').textContent = 'Emergency Phone Contacts: ' + (userData.emergencyContacts || []).join(', ');
                        document.getElementById('profile-unique-id').textContent = 'Your Unique ID: ' + userData.uniqueId;

                        const emergencyContactIds = userData.emergencyContactIds || [];
                        if (emergencyContactIds.length > 0) {
                            Promise.all(emergencyContactIds.map(id =>
                                db.collection('users').doc(id).get().then(doc => doc.exists ? doc.data().name : 'Unknown')
                            )).then(names => {
                                document.getElementById('profile-emergency-ids').textContent = 'Linked Emergency Contacts: ' + names.join(', ');
                            }).catch(error => {
                                console.error('Error loading linked contacts:', error);
                                document.getElementById('profile-emergency-ids').textContent = 'Linked Emergency Contacts: Error loading';
                            });
                        } else {
                            document.getElementById('profile-emergency-ids').textContent = 'Linked Emergency Contacts: None';
                        }

                        document.getElementById('edit-name').value = userData.name;
                        document.getElementById('edit-emergency').value = (userData.emergencyContacts || []).join(', ');
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

        function addEmergencyContactById() {
            const uniqueIdToAdd = document.getElementById('add-emergency-id').value.trim();
            const user = auth.currentUser;

            if (!uniqueIdToAdd) {
                showPopup('Please enter a unique ID.');
                return;
            }

            if (!user) {
                showPopup('Please sign in to add an emergency contact.');
                return;
            }

            db.collection('users').where('uniqueId', '==', uniqueIdToAdd).get()
                .then((querySnapshot) => {
                    if (querySnapshot.empty) {
                        showPopup('No user found with this Unique ID.');
                        return;
                    }

                    const targetUserDoc = querySnapshot.docs[0];
                    const targetUserId = targetUserDoc.id;

                    if (targetUserId === user.uid) {
                        showPopup('You cannot add yourself as an emergency contact.');
                        return;
                    }

                    db.collection('users').doc(user.uid).get().then((doc) => {
                        if (doc.exists) {
                            const currentEmergencyIds = doc.data().emergencyContactIds || [];
                            if (currentEmergencyIds.includes(targetUserId)) {
                                showPopup('This user is already an emergency contact.');
                                return;
                            }

                            currentEmergencyIds.push(targetUserId);
                            db.collection('users').doc(user.uid).update({
                                emergencyContactIds: currentEmergencyIds
                            }).then(() => {
                                showPopup(`Added ${targetUserDoc.data().name} as an emergency contact!`);
                                document.getElementById('add-emergency-id').value = '';
                                loadUserProfile(user.uid);
                            }).catch((error) => showPopup('Error adding contact: ' + error.message));
                        }
                    });
                })
                .catch((error) => showPopup('Error searching for user: ' + error.message));
        }

        function updateProfile() {
            const userId = auth.currentUser.uid;
            const name = document.getElementById('edit-name').value;
            const emergencyContactsInput = document.getElementById('edit-emergency').value;

            if (!name || !emergencyContactsInput) {
                showPopup('Please fill in all fields.');
                return;
            }

            const emergencyContacts = emergencyContactsInput.split(',').map(contact => contact.trim());
            const phoneRegex = /^\+\d{9,15}$/;
            if (!emergencyContacts.every(contact => phoneRegex.test(contact))) {
                showPopup('Please enter valid phone numbers starting with + (e.g., +1234567890), separated by commas.');
                return;
            }

            db.collection('users').doc(userId).update({
                name: name,
                emergencyContacts: emergencyContacts
            })
            .then(() => {
                showPopup('Profile updated!');
                loadUserProfile(userId);
                toggleEditProfile();
            })
            .catch((error) => showPopup('Error updating profile: ' + error.message));
        }

        function signOut() {
            if (locationInterval) {
                stopSharing();
            }
            auth.signOut()
                .then(() => {
                    showPopup('Signed out successfully!');
                    document.getElementById('navbar').style.display = 'none';
                    showPage('signin');
                })
                .catch((error) => showPopup('Error signing out: ' + error.message));
        }

        function submitCommunityPost() {
            const postContent = document.getElementById('community-post').value.trim();
            const user = auth.currentUser;

            if (!user) {
                showPopup('Please sign in to post.');
                return;
            }

            if (!postContent) {
                showPopup('Please write something to post.');
                return;
            }

            const postData = {
                content: postContent,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid
            };

            db.collection('communityPosts').add(postData)
                .then(() => {
                    showPopup('Post submitted successfully!');
                    document.getElementById('community-post').value = '';
                    loadCommunityPosts();
                })
                .catch((error) => showPopup('Error submitting post: ' + error.message));
        }

        function removeCommunityPost(postId) {
            const user = auth.currentUser;
            if (!user) {
                showPopup('Please sign in to remove a post.');
                return;
            }

            db.collection('communityPosts').doc(postId).get()
                .then((doc) => {
                    if (doc.exists && doc.data().userId === user.uid) {
                        db.collection('communityPosts').doc(postId).delete()
                            .then(() => {
                                showPopup('Post removed successfully!');
                                loadCommunityPosts();
                            })
                            .catch((error) => showPopup('Error removing post: ' + error.message));
                    } else {
                        showPopup('You can only remove your own posts.');
                    }
                })
                .catch((error) => showPopup('Error checking post: ' + error.message));
        }

        function loadCommunityPosts() {
            const postsContainer = document.getElementById('community-posts');
            const user = auth.currentUser;
            postsContainer.innerHTML = '<p>Loading posts...</p>';

            db.collection('communityPosts')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get()
                .then((querySnapshot) => {
                    postsContainer.innerHTML = '';
                    if (querySnapshot.empty) {
                        postsContainer.innerHTML = '<p>No posts yet. Be the first to share!</p>';
                        return;
                    }

                    querySnapshot.forEach((doc) => {
                        const post = doc.data();
                        const postElement = document.createElement('div');
                        postElement.classList.add('post-item');
                        const date = post.timestamp ? new Date(post.timestamp.toDate()).toLocaleString() : 'Just now';
                        postElement.innerHTML = `
                            <p>${post.content}</p>
                            <span>Posted: ${date}</span>
                            ${user && post.userId === user.uid ? `<button class="remove-btn" onclick="removeCommunityPost('${doc.id}')">Remove</button>` : ''}
                        `;
                        postsContainer.appendChild(postElement);
                    });
                })
                .catch((error) => {
                    postsContainer.innerHTML = '<p>Error loading posts.</p>';
                    console.error('Error loading community posts:', error);
                });
        }

        let unsubscribeSosListener = null;
        function listenForSosEvents(userId) {
            if (unsubscribeSosListener) unsubscribeSosListener();

            unsubscribeSosListener = db.collection('sosEvents')
                .where('emergencyContactIds', 'array-contains', userId)
                .where('active', '==', true)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const sosData = change.doc.data();
                            const locationUrl = `https://www.google.com/maps?q=${sosData.location.lat},${sosData.location.lng}`;
                            showPopup(`SOS Alert from ${sosData.senderName}! Location: ${locationUrl}`);
                        }
                    });
                }, (error) => {
                    console.error('Error listening for SOS events:', error);
                });
        }

        auth.onAuthStateChanged((user) => {
            if (user) {
                document.getElementById('navbar').style.display = 'flex';
                showPage('home');
                loadUserProfile(user.uid);
                listenForSosEvents(user.uid);

                db.collection('locationShares').doc(user.uid).get().then((doc) => {
                    if (doc.exists && doc.data().active) {
                        stopSharing();
                    }
                });
            } else {
                if (unsubscribeSosListener) unsubscribeSosListener();
                document.getElementById('navbar').style.display = 'none';
                showPage('signin');
                if (locationInterval) {
                    stopSharing();
                }
            }
            loadCommunityPosts(); // Reload posts on auth state change to update remove button visibility
        });
