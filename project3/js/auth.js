$(function() {
    const pb = new PocketBase("http://127.0.0.1:8090");

    function updateHeader() {
        const isAuthenticated = pb.authStore.isValid;
        const email = pb.authStore.model && pb.authStore.model.email;

        $('#sign-up-link, #log-in-link').closest('.account-links').prop('hidden', isAuthenticated);
        $('#auth-account-status')
            .text(isAuthenticated ? (email || 'Signed in') : '')
            .removeAttr('title')
            .prop('hidden', !isAuthenticated);
        $('#logout-button').prop('hidden', !isAuthenticated);
        $('.auth-header').prop('hidden', !isAuthenticated);
    }

    pb.authStore.onChange(updateHeader, true);

    $(document).on('submit', '.login-form', async function(event) {
        event.preventDefault();

        const form = this;
        const $form = $(form);
        const $submit = $form.find('[type="submit"]');
        $form.find('.field-error').remove();
        $submit.prop('disabled', true).text('Logging in...');

        try {
            await pb.collection('users').authWithPassword(
                form.elements.email.value.trim(),
                form.elements.password.value
            );
            form.reset();
            $('#login-overlay').remove();
        } catch (error) {
            console.error('Could not log in:', error);
            $form.append(
                $('<p class="field-error" role="alert">')
                    .text('Login failed. Check your email and password, then try again.')
            );
        } finally {
            $submit.prop('disabled', false).text('Log in');
        }
    });

    $('#logout-button').on('click', function() {
        pb.authStore.clear();
    });
});
