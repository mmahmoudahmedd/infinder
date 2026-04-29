import Swal from 'sweetalert2';

const base = Swal.mixin({
  customClass: {
    popup: '!rounded-2xl',
    confirmButton: '!rounded-full !bg-[#BEF35E] !text-[#0a0a0a] !font-semibold !px-6 !py-2.5 !text-sm',
    title: '!font-bold !text-[#0a0a0a] !text-lg',
    htmlContainer: '!text-gray-600 !text-sm',
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
