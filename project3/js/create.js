const pb = new PocketBase("http://127.0.0.1:8090");

$(function() {
    const $tabs = $('.product-tabs');
    const $panels = $('#product-panels');
    const $summary = $('.summary');
    const selectedProducts = {};
    let ingredients = [];
    let products = [];
    let filters = {
        minPrice: null,
        maxPrice: null,
        minWeight: null,
        maxWeight: null
    };

    function showError(message) {
        $('#products-loading').prop('hidden', true);
        $('#products-error').text(message).prop('hidden', false);
    }

    function readSelectedIngredients() {
        const saved = sessionStorage.getItem('selectedIngredients');
        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(function(item) {
            return typeof item === 'string';
        })) {
            throw new Error('Saved ingredients are not in the expected format.');
        }

        return Array.from(new Set(parsed.map(function(item) {
            return item.trim();
        }).filter(Boolean)));
    }

    function normalized(value) {
        return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function firstValue(record, names) {
        for (const name of names) {
            const value = record[name];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
        return null;
    }

    function ingredientName(value) {
        if (Array.isArray(value)) {
            return value.map(ingredientName).filter(Boolean);
        }
        if (value && typeof value === 'object') {
            return ingredientName(firstValue(value, ['name', 'title', 'ingredient', 'label']));
        }
        return typeof value === 'string' ? value.trim() : '';
    }

    function productIngredients(product) {
        const expanded = product.expand && product.expand.ingredient;
        const value = expanded || firstValue(product, [
            'ingredient',
            'ingredients',
            'ingredientName',
            'ingredient_name',
            'category'
        ]);
        const names = ingredientName(value);
        return Array.isArray(names) ? names : [names];
    }

    function numericValue(value) {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
        }
        if (typeof value !== 'string') {
            return null;
        }

        const parsed = parseFloat(value.replace(/,/g, '').replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getProductPrice(product) {
        return numericValue(firstValue(product, ['price', 'cost', 'productPrice', 'product_price']));
    }

    function getProductWeight(product) {
        return numericValue(firstValue(product, [
            'netWeight',
            'net_weight',
            'weight',
            'size',
            'quantity'
        ]));
    }

    function getProductBrand(product) {
        return firstValue(product, ['brand', 'manufacturer', 'vendor', 'company', 'seller']) ||
            firstValue(product, ['name', 'title', 'productName', 'product_name']) ||
            'Product';
    }

    function renderTabs() {
        $tabs.empty();
        $panels.empty();

        ingredients.forEach(function(ingredient, index) {
            const tabId = 'tab-product-' + index;
            const panelId = 'panel-product-' + index;
            const isFirst = index === 0;
            const $tab = $('<button>', {
                id: tabId,
                type: 'button',
                role: 'tab',
                'aria-selected': isFirst ? 'true' : 'false',
                'aria-controls': panelId,
                tabindex: isFirst ? '0' : '-1'
            }).addClass(isFirst ? 'tab-active' : 'tab').text(ingredient);
            const $panel = $('<section>', {
                id: panelId,
                role: 'tabpanel',
                'aria-labelledby': tabId,
                tabindex: '0',
                hidden: !isFirst
            }).addClass('product-panel');
            const $grid = $('<div class="product-grid">');
            const $empty = $('<p class="product-filter-empty" aria-live="polite">')
                .text('No products are available for this ingredient.')
                .prop('hidden', true);

            $panel.append(
                $('<h2 class="visually-hidden">').text(ingredient + ' products'),
                $grid,
                $empty
            );
            $tabs.append($tab);
            $panels.append($panel);
        });
    }

    function matchesIngredient(product, ingredient) {
        return productIngredients(product).some(function(name) {
            return normalized(name) === normalized(ingredient);
        });
    }

    function renderProduct(product, ingredient) {
        const price = getProductPrice(product);
        const weight = getProductWeight(product);
        const name = firstValue(product, ['name', 'title', 'productName', 'product_name']) || ingredient;
        const brand = getProductBrand(product);
        const imageField = firstValue(product, [
            'image',
            'photo',
            'productImage',
            'product_image',
            'picture'
        ]);
        const imageName = Array.isArray(imageField) ? imageField[0] : imageField;
        const $card = $('<div class="card">')
            .attr('data-product-id', product.id)
            .attr('data-price', price === null ? '' : price)
            .attr('data-net-weight', weight === null ? '' : weight);
        const $content = $('<div class="card-content">')
            .append(
                $('<h3>').text(name),
                $('<p>').text(brand),
                $('<p>').text(price === null ? 'Price unavailable' : '$' + price.toFixed(2)),
                $('<p class="product-net-weight">').text(
                    weight === null ? 'Net weight unavailable' : 'Net weight: ' + weight + ' g'
                ),
                $('<button class="add" type="button">').text('Add')
            );

        if (imageName) {
            $('<img>').attr({
                src: pb.files.getURL(product, imageName),
                alt: name + ' by ' + brand
            }).prependTo($content);
        }

        $card.attr('data-ingredient', ingredient).append($content);
        return $card;
    }

    function renderProducts() {
        let unavailableCount = 0;

        ingredients.forEach(function(ingredient, index) {
            const $panel = $('#panel-product-' + index);
            const $grid = $panel.find('.product-grid');
            const matchingProducts = products.filter(function(product) {
                return matchesIngredient(product, ingredient);
            });

            matchingProducts.forEach(function(product) {
                $grid.append(renderProduct(product, ingredient));
            });
            if (matchingProducts.length === 0) {
                unavailableCount++;
                $grid.next('.product-filter-empty')
                    .text('No product listings are available for this ingredient yet.')
                    .prop('hidden', false);
            }
        });

        $('#products-unavailable-note').prop('hidden', unavailableCount === 0);
    }

    function updateSummary() {
        const $list = $summary.find('.selected-ingredients').empty();
        let total = 0;
        let selectedCount = 0;

        if (ingredients.length === 0) {
            $list.append($('<li class="empty-note">').text('No ingredients selected'));
        } else {
            ingredients.forEach(function(ingredient) {
                const product = selectedProducts[ingredient];
                $list.append($('<li>').text(
                    product ? ingredient + ': ' + product.brand : ingredient + ': No product selected'
                ));
                if (product) {
                    selectedCount++;
                    if (product.price !== null) {
                        total += product.price;
                    }
                }
            });
        }

        $('#products-chosen').text(selectedCount + ' of ' + ingredients.length);
        $('#total-price').text('$' + total.toFixed(2));
        $('#caffeine-row').prop('hidden', !ingredients.some(function(ingredient) {
            return normalized(ingredient) === 'caffeine';
        }));
        $summary.find('a.submit')
            .toggleClass('is-disabled', ingredients.length === 0)
            .attr('aria-disabled', ingredients.length === 0 ? 'true' : 'false');
    }

    function applyFilters() {
        const $activePanel = $panels.find('.product-panel').filter(function() {
            return !this.hidden;
        }).first();
        if (!$activePanel.length) {
            return;
        }

        const $cards = $activePanel.find('.product-grid .card');
        let visibleCount = 0;

        $cards.each(function() {
            const price = numericValue($(this).attr('data-price'));
            const weight = numericValue($(this).attr('data-net-weight'));
            const matches = (filters.minPrice === null ||
                (price !== null && price >= filters.minPrice)) &&
                (filters.maxPrice === null ||
                (price !== null && price <= filters.maxPrice)) &&
                (filters.minWeight === null ||
                (weight !== null && weight >= filters.minWeight)) &&
                (filters.maxWeight === null ||
                (weight !== null && weight <= filters.maxWeight));

            this.hidden = !matches;
            if (matches) {
                visibleCount++;
            }
        });

        $activePanel.find('.product-filter-empty').prop('hidden', visibleCount > 0);
        if ($cards.length === 0) {
            $activePanel.find('.product-filter-empty')
                .text('No product listings are available for this ingredient yet.')
                .prop('hidden', false);
        } else if (visibleCount === 0) {
            $activePanel.find('.product-filter-empty')
                .text('No products match these filters.')
                .prop('hidden', false);
        }
    }

    $tabs.on('click', '[role="tab"]', function() {
        const $tab = $(this);
        $tabs.find('[role="tab"]')
            .attr('aria-selected', 'false')
            .attr('tabindex', '-1')
            .removeClass('tab-active')
            .addClass('tab');
        $tab.attr('aria-selected', 'true')
            .attr('tabindex', '0')
            .removeClass('tab')
            .addClass('tab-active');
        $panels.children('.product-panel').prop('hidden', true);
        $('#' + $tab.attr('aria-controls')).prop('hidden', false);
        applyFilters();
    }).on('keydown', '[role="tab"]', function(event) {
        const $allTabs = $tabs.find('[role="tab"]');
        const currentIndex = $allTabs.index(this);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % $allTabs.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + $allTabs.length) % $allTabs.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = $allTabs.length - 1;
        } else {
            return;
        }

        event.preventDefault();
        $allTabs.eq(nextIndex).trigger('focus').trigger('click');
    });

    $('#product-filter-toggle').on('click', function() {
        const expanded = $(this).attr('aria-expanded') === 'true';
        $(this).attr('aria-expanded', expanded ? 'false' : 'true')
            .attr('aria-label', expanded ? 'Show product filters' : 'Hide product filters');
        $('#product-filter-panel').prop('hidden', expanded);
    });

    $('#product-filter-panel').on('submit', function(event) {
        event.preventDefault();
        filters = {
            minPrice: numericValue($('#min-price').val()),
            maxPrice: numericValue($('#max-price').val()),
            minWeight: numericValue($('#min-weight').val()),
            maxWeight: numericValue($('#max-weight').val())
        };
        applyFilters();
    }).on('reset', function() {
        filters = { minPrice: null, maxPrice: null, minWeight: null, maxWeight: null };
        window.setTimeout(applyFilters);
    });

    $panels.on('click', '.product-grid .add', function() {
        const $card = $(this).closest('.card');
        const ingredient = $card.attr('data-ingredient');
        const productId = $card.attr('data-product-id');
        const existing = selectedProducts[ingredient];

        if (existing && existing.id === productId) {
            delete selectedProducts[ingredient];
        } else {
            const product = products.find(function(item) {
                return item.id === productId;
            });
            if (!product) {
                showError('The selected product could not be found. Please reload the page.');
                return;
            }
            selectedProducts[ingredient] = {
                id: product.id,
                brand: getProductBrand(product),
                price: getProductPrice(product)
            };
        }

        $panels.find('.product-grid .card').each(function() {
            const selected = selectedProducts[$(this).attr('data-ingredient')];
            const isSelected = selected && selected.id === $(this).attr('data-product-id');
            $(this).find('.add')
                .text(isSelected ? 'Added' : 'Add')
                .toggleClass('product-added', Boolean(isSelected));
        });
        updateSummary();
    });

    async function initialize() {
        try {
            ingredients = readSelectedIngredients();
        } catch (error) {
            console.error('Could not read the selected ingredients:', error);
            showError('Could not read your selected ingredients. Please return to the ingredients step and try again.');
            return;
        }

        renderTabs();
        updateSummary();

        if (ingredients.length === 0) {
            $('#products-loading').prop('hidden', true);
            $('#products-error').text('Select at least one ingredient before choosing products.')
                .prop('hidden', false);
            return;
        }

        try {
            products = await pb.collection('products').getFullList({
                expand: 'ingredient'
            });
        } catch (error) {
            console.error('Could not load products from PocketBase:', error);
            showError('Unable to load products from the database. Please try again later.');
            return;
        }

        $('#products-loading').prop('hidden', true);
        renderProducts();
        updateSummary();
        applyFilters();
    }

    $summary.on('click', 'a.submit.is-disabled', function(event) {
        event.preventDefault();
    });

    initialize();
});