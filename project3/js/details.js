const pb = new PocketBase("http://127.0.0.1:8090");
let blendToShow;

$(document).ready(function() {
    loadBlend();
    pb.authStore.onChange(updateDeleteButton);

    $('#details button.x').on('click', function() {
        if (document.referrer.indexOf(window.location.origin) === 0) {
            window.history.back();
        } else {
            window.location.href = 'list.html';
        }
    });

    $('#comment-form').on('submit', function(event) {
        event.preventDefault();

        const $comment = $('#comment');
        const commentText = $comment.val().trim();

        if (!commentText) {
            $comment.trigger('focus');
            return;
        }

        $('#comments').append($('<li>').text(commentText));
        $comment.val('').trigger('focus');
    });

    $('.like-button').on('click', function() {
        const $button = $(this);
        const isLiked = $button.attr('aria-pressed') === 'true';

        $button.attr('aria-pressed', isLiked ? 'false' : 'true')
            .attr('aria-label', isLiked ? 'Like blend' : 'Unlike blend');
    });

    $('.comment-button').on('click', function() {
        $('#comment').trigger('focus');
    });

    $('#delete-blend-button').on('click', async function() {
        if (!blendToShow || !canDeleteBlend()) {
            return;
        }

        if (!window.confirm('Are you sure you want to delete "' + blendToShow.title + '"?')) {
            return;
        }

        const $button = $(this).prop('disabled', true);
        $('#delete-blend-error').prop('hidden', true).text('');

        try {
            await pb.collection('blends').delete(blendToShow.id);
            window.location.href = 'list.html';
        } catch (error) {
            console.error('Could not delete blend:', error);
            $('#delete-blend-error')
                .text('Could not delete this blend. PocketBase may not allow your account to delete it.')
                .prop('hidden', false);
            $button.prop('disabled', false);
        }
    });
});

function canDeleteBlend() {
    const user = pb.authStore.model;
    return pb.authStore.isValid && user && blendToShow.author &&
        [user.username, user.email].includes(blendToShow.author);
}

function updateDeleteButton() {
    $('#delete-blend-button').prop('hidden', !blendToShow || !canDeleteBlend());
}

async function loadBlend() {
    const blendId = new URLSearchParams(window.location.search).get('blend');

    if (!blendId) {
        showBlendMissing();
        return;
    }

    try {
        blendToShow = await pb.collection('blends').getOne(blendId, {
            expand: 'products'
        });
        const blend = blendToShow;

        document.title = 'YNQ - ' + blend.title;
        $('#breadcrumb-title').attr('href', window.location.href)
            .text('/ ' + blend.title + ' ');
        $('#blend-title').text(blend.title);
        $('#username').text(blend.author);
        $('#blend-ingredients').text(blend.ingredients);
        if (blend.flavor) {
            $('#blend-flavor').text(blend.flavor);
            $('#blend-flavor-row').prop('hidden', false);
        }

        const expandedProducts = blend.expand && blend.expand.products;
        const selectedProducts = Array.isArray(expandedProducts)
            ? expandedProducts
            : expandedProducts ? [expandedProducts] : [];
        if (selectedProducts.length > 0) {
            const $productList = $('#blend-products').empty();
            selectedProducts.forEach(function(product) {
                const $item = $('<li>').text(product.name);
                if (product.brand) {
                    $item.append(document.createTextNode(': '), $('<em>').text(product.brand));
                }
                $productList.append($item);
            });
            $('#blend-products-section').prop('hidden', false);
        }
        $('#nutrition-calories').text(formatNutrition(blend.calories));
        $('#nutrition-caffeine').text(formatNutrition(blend.caffeine, 'mg'));
        $('#nutrition-carbs').text(formatNutrition(blend.carbs, 'g'));

        const $cover = $('#blend-detail-cover-img img');
        if (blend.coverImage) {
            $cover.attr({
                src: pb.files.getURL(blend, blend.coverImage),
                alt: 'Cover art for ' + blend.title + ' blend'
            });
        } else {
            $cover.prop('hidden', true);
        }
        updateDeleteButton();
    } catch (err) {
        if (err.status === 404) {
            showBlendMissing();
            return;
        }

        console.error('Could not load blend:', err);
        $('.detail-layout, #actions, #comment-section, #item-path').prop('hidden', true);
        $('<p role="alert">').text('Unable to load this blend. Please try again later.')
            .insertBefore('#blend-missing');
    }
}

// add a dash if there is no value for the nutrition facts in the database
function formatNutrition(value, unit) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    return unit ? value + ' ' + unit : value;
}

function showBlendMissing() {
    $('.detail-layout, #actions, #comment-section, #item-path').prop('hidden', true);
    $('#blend-missing').prop('hidden', false);
}