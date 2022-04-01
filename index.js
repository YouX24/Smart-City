//////////////////////// MAP PAGE ////////////////////////
const sideNav = $(".side-nav-container")
const sideNavClose = $(".side-nav-x")
const sideNavAccordion = $(".accordion-flush")
const sideNavOpen = $(".side-nav-arrow")
const closeNavDiv = $(".close-nav-div")
const mapDiv = $("#map")
let navHidden = false

// list view elements 
let mapHidden = false
const listViewBtn = $(".list-view-btn")
const listViewDiv = $(".list-view-div")

// Closes side bar when X is clicked
sideNavClose.click(function() {
    if (navHidden === false) {
        sideNav.addClass("side-nav-container-hide")
        sideNavAccordion.css("display", "none")
        closeNavDiv.css("display", "none")
        sideNavOpen.css("display", "inline-block")
        navHidden = true

        listViewDiv.css("width", "calc(100vw - 4rem)")
        listViewDiv.css("margin-left", "4rem")
    }
})

// Opens side bar when > is clicked
sideNavOpen.click(function() {
    if (navHidden === true) {
        sideNav.removeClass("side-nav-container-hide")
        sideNavAccordion.css("display", "")
        closeNavDiv.css("display", "")
        sideNavOpen.css("display", "none")
        navHidden = false

        listViewDiv.css("margin-left", "40%")
        listViewDiv.css("width", "calc(100% - 40%)")
    }
})

// List view button function
listViewBtn.click(function() {
    console.log("clciked")
    if (mapHidden === false) {
        mapDiv.css("display", "none")
        listViewDiv.css("display", "block")
        console.log(listViewBtn.text())
        listViewBtn.html("Map View")
        mapHidden = true
    }
    else {
        listViewDiv.css("display", "none")
        mapDiv.css("display", "")
        mapHidden = false
        listViewBtn.html("List View")
    }
})

// Google Map creation
let map
let service
let infoWindow
let autocomplete
let markers = []

// Map functionality
function initMap() {
    // Location of Eau Claire
    const eauclaire = { lat: 44.811348, lng: -91.498497 };

    // Creates an object of google maps, centering on Eau Claire
    map = new google.maps.Map(document.getElementById("map"), {
        center: eauclaire,
        zoom: 13
    });

    // Information Window WORK ON THIS (style information window in HTML CSS)
    infoWindow = new google.maps.InfoWindow({
        content: $(".place-information")
    })

    // Marker for Eau Claire
    const marker = new google.maps.Marker({
        position: eauclaire,
        map: map
    })

    // Create the places services
    service = new google.maps.places.PlacesService(map);

    //Add click listener to all checkboxes
    let checkBoxes = $("input")
    for (let i = 0; i < checkBoxes.length; i++) {
        let box = $(checkBoxes[i])
        
        box.click(function() {

            let request = setRequest(eauclaire, box.val(), google.maps.places.RankBy.DISTANCE)

            // console.log(request)
            if (box[0].checked) {
                service.nearbySearch(request, function(results, status, pagination) {
                    if (status !== "OK" || !results) {
                        return
                    }
                    addPlaces(results, map, box.val())
                })
                // console.log(markers)
            }
            else {
                clearMarkers(box.val())
            }
        })
    }
}

// function to add markers to map and list
function addPlaces(places, map, imgUrl) {
    for (const place of places) {
        if (place.geometry && place.geometry.location) {
            // Customize image before setting it as a icon on the map
            const image = {
            url: "images/" + imgUrl + ".svg",
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25),
            };

            const placeListItem = document.getElementById("place-list")
            placeListItem.innerHTML += getListPhoto(imgUrl, place)

            // Create infowindow
            const infowindow = new google.maps.InfoWindow({
                content: getPhoto(place),
                maxWidth: 350
            });

            // Create a new marker on the map and store a reference in markers array
            const marker = new google.maps.Marker({
                map,
                icon: image,
                title: place.name,
                position: place.geometry.location,
            })

            // Show infowindow when marker is clicked
            marker.addListener("click", function() {
                infowindow.open({
                    anchor: marker,
                    map,
                    shouldFocus: false
                })
            })

            markers.push(marker)
        }
    }
}

// go through markers array and remove all markers that has value of checkbox
function clearMarkers(boxValue) {
    for (let i = 0; i < markers.length; i++) {
        markerCategory = markers[i].icon.url

        if (markerCategory === 'images/' + boxValue + '.svg') {
            markers[i].setMap(null);
        }

    }
    
    // Remove Item from list view
    const removeItem = boxValue + "item"
    let itemsToRemove = document.querySelectorAll("." + removeItem);
    for (let i = 0; i < itemsToRemove.length; i++) {
        console.log(itemsToRemove[i])
        itemsToRemove[i].remove()
    }
}

// Helper function to set request type
function setRequest(cityGeoCordinate, placeType, rankingBy) {
    let request = {
        location: cityGeoCordinate,
        type: placeType,
        rankBy: rankingBy
    }
    return request
}

// Helper function to get place image, if it exist
function getPhoto(place) {
    let contentString
    if ("photos" in place) {
        contentString = 
            '<div style="text-align: center">' + 
                '<img src="' + place.photos[0].getUrl({maxWidth: 300, maxHeight: 200}) + '" > ' +
                '<h4>' + place.name + '</h4>' + 
                '<p>' + place.vicinity + '</p>' +
            '</div>'
        }
    else {
        contentString =
        '<div style="text-align: center">' + 
            '<h4>' + place.name + '</h4>' + 
            '<p>' + place.vicinity + '</p>' +
        '</div>'
        }
    return contentString
}

function getListPhoto(imgUrl, place) {
    let listViewContent
    if ("photos" in place) {
        listViewContent = '<div class="place-list-item ' + imgUrl + 'item' + '">' + '<img src=' + place.photos[0].getUrl({maxWidth: 300, maxHeight: 200}) + '>' + '<h4>' + place.name + '</h4><p>' + place.vicinity + '</p></div>'
    }
    else {
        listViewContent = '<div class="place-list-item ' + imgUrl + 'item' + '">' + '<img class="placeIcon" src=' + 'images/' + imgUrl + '.svg' + '>' + '<h4>' + place.name + '</h4><p>' + place.vicinity + '</p></div>'
    }
    return listViewContent
}



//////////////////////// NEWS PAGE ////////////////////////
const articleDiv = document.querySelector(".article-div")
const newList = document.querySelector(".news-list")
const apiKey = '193d6b2d97a84fdc9e152357714fa66f'

let url = `https://newsapi.org/v2/everything?q=eau+claire+wisconsin&apiKey=${apiKey}`

// fetch(url).then(function(res) {
//     return res.json()
// }).then(function(data) {
//     console.log(data)
//     data.articles.forEach(function(article) {
//         articleDiv.innerHTML += 
//         `<div class="article-el">
//             <img src="${article.urlToImage}" class="article-img" alt="">
//             <div class="article-body">
//                 <h2 class="article-title">${article.title}</h3>
//                 <p class="article-text">${article.description}</p>
//                 <a href="${article.url}" target="_blank" class="article-link">Read More</a>
//             </div>
//         </div>`
//     })
// })