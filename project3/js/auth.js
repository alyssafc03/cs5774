$(function() {
    const pb = new PocketBase("http://127.0.0.1:8090");

    function updateHeader() {
        const signedIn = pb.authStore.isValid;
        $('#auth-account-status')
            .text(signedIn ? (pb.authStore.model.name || 'Signed in') : '')
            .prop('hidden', !signedIn);
        $('#sign-up-link, #log-in-link').closest('.account-links').prop('hidden', signedIn);
        $('.auth-header, #logout-button').prop('hidden', !signedIn);
    }

    pb.authStore.onChange(updateHeader, true);

    $(document).on('submit', '.login-form', async function (event) {
        event.preventDefault();
        const form = this;
        const $form = $(form);
        const $button = $form.find('[type="submit"]');

        $form.find('.field-error').remove();
        $button.prop('disabled', true).text('Logging in...');

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
            $button.prop('disabled', false).text('Log in');
        }
    });

    $('#logout-button').on('click', () => pb.authStore.clear());
});
