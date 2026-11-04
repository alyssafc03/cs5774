$(function () {
    // <><><> simulated search results for the site search page <><><>
    
    // search results for the site search page
    var SEARCH_KEYPHRASE = 'caffeine';
    var $blendGrid = $('.blend-grid');

    // only run search on list page
    if ($blendGrid.length) {
        // get what user submitted in the search form
        var params = new URLSearchParams(window.location.search);
        var submittedText = params.get('q') || '';
        var submittedPhrase = submittedText.trim().toLowerCase();

        // show what the user typed
        $('.search-term').text(submittedText);

        // keep typed phrase in header search input
        $('.site-search input[name="q"]').val(submittedText);

        // if the user typed the search phrase, show results
        if (submittedPhrase === SEARCH_KEYPHRASE) {
            $blendGrid.children('.card').each(function (){
                var $card = $(this);
                // get the ingredients for this blend
                var ingredients = $card.attr('data-ingredients') || '';
                // filter out cards that aren't relevant
                $card.prop('hidden', ingredients.indexOf(SEARCH_KEYPHRASE) === -1);
            });
            $('#search-summary').prop('hidden', false);
        }
        // no search submitted
        else if (submittedPhrase == '') {
            // do nothing
        }
        else {
            // hide all cards
            $blendGrid.prop('hidden', true);
            // show no results message
            $('#search-none').prop('hidden', false);
        }
    }

    // <><><> blend details page <><><>
    // info for each blend detail view page
    var BLENDS = {
        'funky-fuel': {
            title: 'Funky Fuel', author: 'funkopop_fighter', cover: 'img/blend-cover-1.jpg',
            ingredients: 'Caffeine, creatine, beta-alanine, L-citrulline, L-theanine, taurine, vitamin B6',
            calories: '10', caffeine: '200 mg', carbs: '2 g', protein: '0 g'
        },
        'tropical-trap-tuesday': {
            title: 'Tropical Trap Tuesday', author: 'leanbeefpatty', cover: 'img/blend-cover-2.jpg',
            ingredients: 'Caffeine, creatine, taurine',
            calories: '15', caffeine: '150 mg', carbs: '3 g', protein: '0 g'
        },
        'dare-to-do-exercise': {
            title: 'Dare to do exercise', author: 'g_deutch', cover: 'img/blend-cover-3.jpg',
            ingredients: 'Caffeine, creatine, beta-alanine',
            calories: '5', caffeine: '300 mg', carbs: '1 g', protein: '0 g'
        },
        'diva-dominator': {
            title: 'Diva Dominator', author: 'aquena', cover: 'img/blend-cover-4.jpg',
            ingredients: 'Caffeine, taurine, L-citrulline, L-theanine',
            calories: '10', caffeine: '180 mg', carbs: '2 g', protein: '0 g'
        },
        'dynamite': {
            title: 'Dynamite', author: 'gym.monger', cover: 'img/blend-cover-5.jpg',
            ingredients: 'Caffeine, taurine, L-citrulline, L-theanine',
            calories: '20', caffeine: '350 mg', carbs: '4 g', protein: '0 g'
        },
        'spiritual-spinal-sunday': {
            title: 'Spiritual Spinal Sunday', author: 'zesty', cover: 'img/blend-cover-6.jpg',
            ingredients: 'Taurine, L-citrulline, L-theanine',
            calories: '10', caffeine: '0 mg', carbs: '2 g', protein: '0 g'
        }
    };

    var $blendTitle = $('#blend-title');

    // only run on the details page
    if ($blendTitle.length) {
        // blend that the url asks for
        var blendId = new URLSearchParams(window.location.search).get('blend');

        // validation: if the url asks for a blend that doesn't exist, show a "not found" message
        if (Object.prototype.hasOwnProperty.call(BLENDS, blendId)) {
            var blend = BLENDS[blendId];

            // fill the page in with this blend's info
            document.title = 'YNQ - ' + blend.title;
            $('#breadcrumb-title').text('/ ' + blend.title + ' ');
            $('#blend-detail-cover-img img').attr({
                src: blend.cover,
                alt: 'cover art for ' + blend.title + ' blend'
            });
            $('#username').text(blend.author);
            $blendTitle.text(blend.title);
            $('#blend-ingredients').text(blend.ingredients);
            $('#nutrition-calories').text(blend.calories);
            $('#nutrition-caffeine').text(blend.caffeine);
            $('#nutrition-carbs').text(blend.carbs);
            $('#nutrition-protein').text(blend.protein);
        }
        else {
            // unknown blend: hide the details and show the not found message
            $('.detail-layout, #actions, #comment-section, #item-path').prop('hidden', true);
            $('#blend-missing').prop('hidden', false);
        }

        // x button: close the details and go back to the page the user came from
        $('#details button.x').on('click', function () {
            // came from a page on this site (list, search results...): go back to it
            if (document.referrer.indexOf(window.location.origin) === 0) {
                window.history.back();
            }
            // opened the details page directly: nowhere to go back to, so go to the list
            else {
                window.location.href = 'list.html';
            }
        });
    }

    // <><><> create blend / product selection <><><>
    var $ingredientGrid = $('.ingredient-grid');
    var $summary = $('.summary');

    // Save the ingredients selected on the Ingredients page so they can
    // be used again when the user moves to the Products page.
    function saveSelectedIngredients() {
        var selectedIngredients = [];

        $ingredientGrid.find('.card-toggle:checked').each(function() {
            selectedIngredients.push($(this).val());
        });

        sessionStorage.setItem(
            'selectedIngredients',
            JSON.stringify(selectedIngredients)
        );
    }

    // Get the ingredients saved on the Ingredients page.
    function getSelectedIngredients() {
        var savedIngredients = sessionStorage.getItem('selectedIngredients');

        if (savedIngredients) {
            return JSON.parse(savedIngredients);
        }

        return [];
    }

    // Update the ingredient list shown in the blend summary.
    function updateIngredientSummary(ingredients) {
        var $ingredientList = $summary.find('.selected-ingredients');

        if (!$ingredientList.length) {
            return;
        }

        $ingredientList.empty();

        if (ingredients.length === 0) {
            $ingredientList.append(
                $('<li class="empty-note">').text('No ingredients selected')
            );
            return;
        }

        $.each(ingredients, function(index, ingredient) {
            $ingredientList.append(
                $('<li>').text(ingredient)
            );
        });
    }

    // Run when an ingredient checkbox is checked or unchecked.
    // Event delegation is used by listening on the ingredient grid and
    // handling changes from its checkbox elements.
    $ingredientGrid.on('change', '.card-toggle', function() {

        var $checkbox = $(this);
        var $card = $checkbox.closest('.card');
        var ingredient = $checkbox.val();

        // Highlight the selected card.
        if ($checkbox.is(':checked')) {
            $card.addClass('is-selected');
        } else {
            $card.removeClass('is-selected');
        }

        // Get all currently selected ingredients.
        var selectedIngredients = [];

        $ingredientGrid.find('.card-toggle:checked').each(function() {
            selectedIngredients.push($(this).val());
        });

        // Update and save the summary.
        updateIngredientSummary(selectedIngredients);
        saveSelectedIngredients();

        // No products have been chosen yet on the next step.
        $('#products-chosen').text('0 of ' + selectedIngredients.length);
        $('#total-price').text('$0.00');

        // Show caffeine information when caffeine is selected.
        if (selectedIngredients.indexOf('Caffeine') !== -1) {
            $('#caffeine-row').show();
        } else {
            $('#caffeine-row').hide();
        }

        // Enable or disable Continue.
        if (selectedIngredients.length > 0) {
            $summary.find('a.submit')
                .removeClass('is-disabled')
                .attr('aria-disabled', 'false');
        } else {
            $summary.find('a.submit')
                .addClass('is-disabled')
                .attr('aria-disabled', 'true');
        }
    });

    // Stop the Continue button from working when it is disabled.
    $summary.on('click', 'a.submit.is-disabled', function(event) {
        event.preventDefault();
    });


    // <><><> product selection on the Products page <><><>
    // Stores one selected product for each ingredient.
    var selectedProducts = {};

    // Update the product summary using the ingredients selected on
    // the previous page and the products selected on this page.
    function updateProductSummary() {
        var $productList = $('.selected-ingredients');
        var selectedIngredients = getSelectedIngredients();

        if (!$productList.length) {
            return;
        }

        $productList.empty();

        if (selectedIngredients.length === 0) {
            $productList.append(
                $('<li class="empty-note">').text('No ingredients selected')
            );
        } else {
            $.each(selectedIngredients, function(index, ingredient) {
                var product = selectedProducts[ingredient];

                if (product) {
                    $productList.append(
                        $('<li>').text(ingredient + ': ' + product.brand)
                    );
                } else {
                    $productList.append(
                        $('<li>').text(ingredient + ': No product selected')
                    );
                }
            });
        }

        var productCount = Object.keys(selectedProducts).length;
        var ingredientCount = selectedIngredients.length;
        var totalPrice = 0;

        $.each(selectedProducts, function(ingredient, product) {
            totalPrice += product.price;
        });

        $('#products-chosen').text(
            productCount + ' of ' + ingredientCount
        );

        $('#total-price').text(
            '$' + totalPrice.toFixed(2)
        );
    }

    // Add/remove products when the user clicks an Add button.
    // The product grid uses event delegation, and closest() is used
    // for DOM traversal from the clicked button to its product card.
    $('.product-grid').on('click', '.add', function() {

        var $button = $(this);
        var $card = $button.closest('.card');
        var ingredient = $card.find('h3').first().text().trim();
        var brand = $card.find('p').eq(0).text().trim();
        var priceText = $card.find('p').eq(1).text().trim();
        var price = parseFloat(priceText.replace('$', ''));

        // Clicking an already-selected product removes it.
        if (selectedProducts[ingredient] &&
            selectedProducts[ingredient].brand === brand) {

            delete selectedProducts[ingredient];
            $button.text('Add').removeClass('product-added');

        } else {
            // Only one product can be selected for each ingredient.
            $('.product-grid .card').each(function() {
                var $otherCard = $(this);
                var otherIngredient = $otherCard.find('h3').first().text().trim();

                if (otherIngredient === ingredient) {
                    $otherCard.find('.add')
                        .text('Add')
                        .removeClass('product-added');
                }
            });

            selectedProducts[ingredient] = {
                brand: brand,
                price: price
            };

            $button.text('Added').addClass('product-added');
        }

        updateProductSummary();
    });

    // Initialize the Products page from the saved ingredient selections.
    if ($('.product-grid').length) {
        var savedIngredients = getSelectedIngredients();

        updateProductSummary();

        // No ingredients means there is nothing to choose products for.
        if (savedIngredients.length === 0) {
            $('.summary a.submit')
                .addClass('is-disabled')
                .attr('aria-disabled', 'true');
        }
    }

    // <><><> login/sign-up <><><>
    /* AI used to help generate the below section of code */

    var $loginLink = $('#log-in-link');

    // open the login window when Log In is clicked
    $loginLink.on('click', function(event) {
        event.preventDefault();

        // create the login modal
        var $modal = $('<div class="modal-overlay" id="login-overlay">');
        var $dialog = $('<div class="modal">');

        var $closeButton = $('<button class="x modal-close">')
            .attr('type', 'button')
            .text('x');

        var $title = $('<h2>').text('Log in');

        var $form = $('<form class="login-form">');

        // username
        var $username = $('<div class="form-text">').append(
            $('<label>').attr('for', 'login-username').text('Username'),
            $('<input>').attr({
                id: 'login-username',
                type: 'text'
            })
        );
        // password
        var $password = $('<div class="form-text">').append(
            $('<label>').attr('for', 'login-password').text('Password'),
            $('<input>').attr({
                id: 'login-password',
                type: 'password'
            })
        );
        // login button
        var $submit = $('<button class="submit">')
            .attr('type', 'submit')
            .text('Log in');

        // put everything together
        $form.append($username, $password, $submit);
        $dialog.append($closeButton, $title, $form);
        $modal.append($dialog);

        // add modal to page
        $('body').append($modal);

        // close modal when X is clicked
        $('.modal-close').on('click', function() {
            $('#login-overlay').remove();
        });

        // close modal when dark background is clicked
        $modal.on('click', function(event) {
            if (event.target === this) {
                $modal.remove();
            }
        });


        // check the login form
        $form.on('submit', function(event) {
            event.preventDefault();

            var username = $('#login-username').val();
            var password = $('#login-password').val();

            // remove old error messages
            $('.field-error').remove();

            // check username
            if (username === '') {
                $('#login-username').after(
                    $('<p class="field-error">').text('Please enter a username.')
                );
                return;
            }
            // check password
            if (password === '') {
                $('#login-password').after(
                    $('<p class="field-error">').text('Please enter a password.')
                );
                return;
            }

            // password needs at least 6 characters
            if (password.length < 6) {
                $('#login-password').after(
                    $('<p class="field-error">')
                        .text('Password must be at least 6 characters.')
                );
                return;
            }

            // login was successful
            $form.replaceWith(
                $('<div class="login-success">').append(
                    $('<p>').text('Welcome back, ' + username + '!'),
                    $('<button class="submit modal-close">')
                        .attr('type', 'button')
                        .text('Done')
                )
            );

            // close the modal when Done is clicked
            $('.modal-close').on('click', function() {
                $('#login-overlay').remove();
            });
        });
    });
    // sign up modal

    var $signUpLink = $('#sign-up-link');

    // Open the sign-up window when Sign Up is clicked
    $signUpLink.on('click', function(event) {
        event.preventDefault();

        // Create the modal
        var $modal = $('<div class="modal-overlay" id="signup-overlay">');
        var $dialog = $('<div class="modal">');

        var $closeButton = $('<button class="x modal-close">')
            .attr('type', 'button')
            .text('x');

        var $title = $('<h2>').text('Create an Account');

        var $form = $('<form class="signup-form">');

        // Username
        var $username = $('<div class="form-text">').append(
            $('<label>').attr('for', 'signup-username').text('Username'),
            $('<input>').attr({
                id: 'signup-username',
                type: 'text'
            })
        );

        // Email
        var $email = $('<div class="form-text">').append(
            $('<label>').attr('for', 'signup-email').text('Email'),
            $('<input>').attr({
                id: 'signup-email',
                type: 'email'
            })
        );

        // Password
        var $password = $('<div class="form-text">').append(
            $('<label>').attr('for', 'signup-password').text('Password'),
            $('<input>').attr({
                id: 'signup-password',
                type: 'password'
            })
        );

        // Sign-up button
        var $submit = $('<button class="submit">')
            .attr('type', 'submit')
            .text('Sign Up');

        // Put the form together
        $form.append($username, $email, $password, $submit);
        $dialog.append($closeButton, $title, $form);
        $modal.append($dialog);

        // Add modal to the page
        $('body').append($modal);


        // Close the modal when X is clicked
        $('.modal-close').on('click', function() {
            $('#signup-overlay').remove();
        });


        // Close when clicking outside the modal
        $modal.on('click', function(event) {
            if (event.target === this) {
                $modal.remove();
            }
        });


        // Check the sign-up form
        $form.on('submit', function(event) {
            event.preventDefault();

            var username = $('#signup-username').val();
            var email = $('#signup-email').val();
            var password = $('#signup-password').val();

            // Remove old error messages
            $('.field-error').remove();

            // Check username
            if (username === '') {
                $('#signup-username').after(
                    $('<p class="field-error">').text('Please enter a username.')
                );
                return;
            }

            // Check email
            if (email === '') {
                $('#signup-email').after(
                    $('<p class="field-error">').text('Please enter an email.')
                );
                return;
            }

            // Check password
            if (password === '') {
                $('#signup-password').after(
                    $('<p class="field-error">').text('Please enter a password.')
                );
                return;
            }

            // Password needs at least 6 characters
            if (password.length < 6) {
                $('#signup-password').after(
                    $('<p class="field-error">')
                        .text('Password must be at least 6 characters.')
                );
                return;
            }

            // Sign-up was successful
            $form.replaceWith(
                $('<div class="login-success">').append(
                    $('<p>').text('Account created! Welcome, ' + username + '!'),
                    $('<button class="submit modal-close">')
                        .attr('type', 'button')
                        .text('Done')
                )
            );

            // Close when Done is clicked
            $('.modal-close').on('click', function() {
                $('#signup-overlay').remove();
            });
        });
    });
})