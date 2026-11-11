$(function() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    const $form = $('#blend-details-form');
    const $button = $('#save-blend-button');
    let ingredients = [];
    let products = {};

    $form.on('input change', 'input, select', function() {
        sessionStorage.setItem('blendDetails', JSON.stringify({
            name: $('#blend-name').val(),
            flavor: $('#blend-flavor').val()
        }));
    });

    function showLoadError(message) {
        $('#review-loading').prop('hidden', true);
        $('#review-error').text(message).prop('hidden', false);
    }

    function getNumber(value) {
        const number = parseFloat(String(value).replace(/,/g, '').replace(/[^\d.-]/g, ''));
        return Number.isFinite(number) ? number : null;
    }

    async function loadProducts() {
        ingredients = JSON.parse(sessionStorage.getItem('selectedIngredients') || '[]');
        const savedProducts = JSON.parse(sessionStorage.getItem('selectedProducts') || '{}');
        const savedDetails = JSON.parse(sessionStorage.getItem('blendDetails') || '{}');

        if (!Array.isArray(ingredients) || !savedProducts || Array.isArray(savedProducts)) {
            throw new Error('Saved blend selections are invalid.');
        }

        $('#blend-name').val(savedDetails.name || '');
        $('#blend-flavor').val(savedDetails.flavor || '');

        const selected = await Promise.all(ingredients.map(async function(ingredient) {
            const id = savedProducts[ingredient];
            return id ? pb.collection('products').getOne(id) : null;
        }));

        ingredients.forEach(function(ingredient, index) {
            if (selected[index]) {
                products[ingredient] = selected[index];
            }
        });

        showSummary();
    }

    function showSummary() {
        const $list = $('#review-ingredients').empty();
        let total = 0;
        let count = 0;

        if (ingredients.length === 0) {
            $list.append($('<li>').text('No ingredients selected'));
        }

        ingredients.forEach(function(ingredient) {
            const product = products[ingredient];
            const price = product && getNumber(product.price);
            const description = product
                ? (product.brand || product.name) + (price === null ? '' : ' — $' + price.toFixed(2))
                : 'No product selected';

            $list.append($('<li>').text(ingredient + ': ' + description));

            if (product) {
                count++;
                if (price !== null) {
                    total += price;
                }
            }
        });

        const caffeine = ingredients.find(function(name) {
            return name.toLowerCase() === 'caffeine';
        });
        const caffeineProduct = products[caffeine];
        const caffeineAmount = caffeineProduct
            ? caffeineProduct.caffeine_content
            : null;

        $('#review-caffeine-row').prop('hidden', !caffeine);
        $('#review-caffeine-content').text(
            !caffeineProduct ? 'Not selected'
                : caffeineAmount === null || caffeineAmount === undefined || caffeineAmount === ''
                    ? 'Unknown' : caffeineAmount + ' mg'
        );
        $('#review-products-chosen').text(count + ' of ' + ingredients.length);
        $('#review-total-price').text('$' + total.toFixed(2));
        $('#review-loading').prop('hidden', true);
        $button.prop('disabled', ingredients.length === 0);
    }

    
    $form.on('submit', async function(event) {
        event.preventDefault();

        const $error = $('#review-save-error').text('').prop('hidden', true);
        const title = $('#blend-name').val().trim();
        const flavorSelect = $('#blend-flavor')[0];
        const cover = $('#blend-cover')[0].files[0];

        if (!ingredients.length) {
            $error.text('Select at least one ingredient before saving your blend.')
                .prop('hidden', false);
            return;
        }
        if (cover && cover.type && !cover.type.startsWith('image/')) {
            $error.text('Choose a valid image file for your cover.').prop('hidden', false);
            return;
        }

        $button.prop('disabled', true).text('Saving...');

        const caffeine = ingredients.find(function(name) {
            return name.toLowerCase() === 'caffeine';
        });
        const caffeineProduct = products[caffeine];
        const caffeineAmount = caffeineProduct
            ? getNumber(caffeineProduct.caffeine_content) || 0
            : 0;
        const user = pb.authStore.model;
        const data = new FormData();

        data.append('title', title);
        data.append('author', user && user.name ? user.name : 'Guest');
        data.append('ingredients', ingredients.join(', '));
        data.append('flavor', flavorSelect.options[flavorSelect.selectedIndex].text);
        data.append('caffeine', caffeineAmount);
        Object.values(products).forEach(function(product) {
            data.append('products', product.id);
        });
        if (cover) {
            data.append('coverImage', cover);
        }

        try {
            const blend = await pb.collection('blends').create(data);
            sessionStorage.removeItem('selectedIngredients');
            sessionStorage.removeItem('selectedProducts');
            sessionStorage.removeItem('blendDetails');
            window.location.href = 'details.html?blend=' + encodeURIComponent(blend.id);
        } catch (error) {
            console.error('Could not save the blend:', error);
            const message = error.response && error.response.message;
            $error.text(message
                ? 'Unable to save your blend: ' + message
                : 'Unable to save your blend. Check the form and try again.')
                .prop('hidden', false);
            $button.prop('disabled', false).text('Save blend');
        }
    });

    loadProducts().catch(function(error) {
        console.error('Could not load the selected products:', error);
        showLoadError('Unable to load your blend. Return to product selection and try again.');
    });
});
