const pb = new PocketBase("http://127.0.0.1:8090");


$(document).ready(function() {
    loadBlends();
});

async function loadBlends() {
    try {
       const blends = await pb.collection('blends').getFullList();
       blends.forEach(function(blend) {
        $('.blend-grid').append(createCard(blend));
       });
    } catch (err) {
        console.error('Could not load blends:', err);
    }
}

function createCard(blend) {
    var div = $('<div class="card" data-ingredients="' + blend.ingredients +
                                '" data-calories="'    + blend.calories    +
                                '" data-caffeine="'    + blend.caffeine    +
                                '" data-carbs="'       + blend.carbs       +
                                '"></div>');
    
    var link = $('<a href="details.html?blend=' + blend.id + '"></a>').appendTo(div);
    $('<img class="card-img" alt="blend cover">')
        .attr('src', pb.files.getURL(blend, blend.coverImage))
        .appendTo(link);
    $('<p class="card-title">' + blend.title + '</p>').appendTo(link);
    
    $('<a href="#" class="card-author">' + blend.author + '</a>').appendTo(div);
    
    return div;
}