const pb = new PocketBase("http://127.0.0.1:8090");
let blendToShow;

$(document).ready(function() {
    loadBlend();
    pb.authStore.onChange(updateOwnerButtons);

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

    $('#edit-blend-button').on('click', function() {
        if (!blendToShow || !canEditBlend()) {
            return;
        }

        $('#edit-blend-title').val(blendToShow.title);
        const $flavor = $('#edit-blend-flavor');
        if (!$flavor.find('option').toArray().some(function(option) {
            return option.value === blendToShow.flavor;
        })) {
            $flavor.append($('<option>').val(blendToShow.flavor).text(blendToShow.flavor));
        }
        $flavor.val(blendToShow.flavor);
        $('#edit-blend-error').prop('hidden', true).text('');
        $('#blend-title').prop('hidden', true);
        $('#edit-blend-form').prop('hidden', false);
        $('#edit-blend-title').trigger('focus');
    });

    $('#cancel-blend-edit').on('click', function() {
        $('#edit-blend-form').prop('hidden', true);
        $('#blend-title').prop('hidden', false);
    });

    $('#edit-blend-form').on('submit', async function(event) {
        event.preventDefault();
        if (!blendToShow || !canEditBlend()) {
            return;
        }

        const title = $('#edit-blend-title').val().trim();
        const flavor = $('#edit-blend-flavor').val();
        const $button = $('#save-blend-changes').prop('disabled', true);
        const $error = $('#edit-blend-error').prop('hidden', true).text('');

        if (!title || !flavor) {
            $error.text('Enter a name and choose a flavor.').prop('hidden', false);
            $button.prop('disabled', false);
            return;
        }

        try {
            blendToShow = await pb.collection('blends').update(blendToShow.id, {
                title: title,
                flavor: flavor
            });
            $('#blend-title').text(blendToShow.title).prop('hidden', false);
            $('#blend-flavor').text(blendToShow.flavor);
            $('#blend-flavor-row').prop('hidden', false);
            $('#breadcrumb-title').attr('href', window.location.href)
                .text('/ ' + blendToShow.title + ' ');
            document.title = 'YNQ - ' + blendToShow.title;
            $('#edit-blend-form').prop('hidden', true);
        } catch (error) {
            console.error('Could not update blend:', error);
            $error.text('Could not save your changes. Check the PocketBase update rule and try again.')
                .prop('hidden', false);
        } finally {
            $button.prop('disabled', false);
        }
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
    return pb.authStore.isValid && user && user.name &&
        blendToShow.author === user.name;
}

function canEditBlend() {
    return canDeleteBlend();
}

function updateOwnerButtons() {
    const owner = Boolean(blendToShow && canDeleteBlend());
    $('#edit-blend-button, #delete-blend-button').prop('hidden', !owner);
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
        updateOwnerButtons();
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