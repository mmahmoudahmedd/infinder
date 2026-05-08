import Swal from 'sweetalert2';

const base = Swal.mixin({
  background: '#1a1a1a',
  color: '#ffffff',
  customClass: {
    popup: '!rounded-2xl',
    confirmButton: '!rounded-full !bg-[#BEF35E] !text-[#0a0a0a] !font-semibold !px-6 !py-2.5 !text-sm',
    title: '!font-bold !text-white !text-lg',
    htmlContainer: '!text-gray-400 !text-sm',
  },
  buttonsStyling: false,
});

const toastMixin = base.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  iconColor: '#BEF35E',
});

export function showToast(title: string, icon: 'success' | 'info' = 'success') {
  return toastMixin.fire({ title, icon });
}

export function showAlert(
  title: string,
  text?: string,
  icon: 'error' | 'warning' | 'info' = 'error',
) {
  return base.fire({ title, text, icon });
}

export function showSuccess(title: string, text?: string) {
  return base.fire({ title, text, icon: 'success', iconColor: '#BEF35E' });
}

export function showError(title: string, text?: string) {
  return base.fire({ title, text, icon: 'error', iconColor: '#ef4444' });
}

export function showLoading(title: string) {
  return Swal.fire({
    title,
    background: '#1a1a1a',
    color: '#ffffff',
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    customClass: {
      popup: '!rounded-2xl',
      title: '!font-bold !text-white !text-lg',
    },
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function closeLoading() {
  Swal.close();
}

export function showCopyToast() {
  return Swal.fire({
    title: 'Copied!',
    toast: true,
    position: 'top-right',
    showConfirmButton: false,
    timer: 1500,
    timerProgressBar: true,
    icon: 'success',
    iconColor: '#BEF35E',
    background: '#1a1a1a',
    color: '#ffffff',
  });
}
