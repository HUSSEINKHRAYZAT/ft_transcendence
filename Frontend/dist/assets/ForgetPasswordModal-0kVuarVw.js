import{B as w,y as r,l as c,c as g}from"./index-BkxLX6Gf.js";class y extends w{constructor(){super()}getModalTitle(){return r("Reset Password")}getModalContent(){return`
      <div class="text-center mb-6">
        <div class="w-16 h-16 mx-auto mb-4 bg-lime-500/20 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0a2 2 0 01-2 2m2-2H9m6 0V9a2 2 0 00-2-2M9 7a2 2 0 012 2v0a2 2 0 002 2m-2-4H9m0 0V7a2 2 0 012-2m-2 2V7a2 2 0 00-2 2v4a2 2 0 002 2h2m-6-4v4a2 2 0 002 2h4"></path>
          </svg>
        </div>
        <p class="text-gray-300 mb-2">${r("Enter your email and new password")}</p>
        <p class="text-gray-400 text-sm">${r("We will send you a verification code")}</p>
      </div>

      <form id="forgot-password-form">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${r("Email Address")}</label>
          <input type="email" id="forgot-email" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${r("Enter your email address")}">
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-300 mb-2">${r("New Password")}</label>
          <input type="password" id="forgot-password" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${r("Enter your new password")}">
          <div id="password-error" class="hidden mt-1 text-red-400 text-xs"></div>
          <div id="password-strength" class="mt-2">
            <div class="flex space-x-1">
              <div class="password-req" id="length-req">
                <span class="text-gray-400 text-xs">✗ ${r("signup.passwordReqLength")||"At least 8 characters"}</span>
              </div>
            </div>
            <div class="flex space-x-1 mt-1">
              <div class="password-req" id="chars-digits-req">
                <span class="text-gray-400 text-xs">✗ ${r("signup.passwordReqCharsDigits")||"Contains letters and numbers"}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-300 mb-2">${r("Confirm Password")}</label>
          <input type="password" id="forgot-confirm-password" required
                 class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                 placeholder="${r("Confirm your new password")}">
          <div id="confirm-password-error" class="hidden mt-1 text-red-400 text-xs"></div>
        </div>

        <div id="forgot-password-error" class="hidden mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm"></div>

        <div class="flex gap-3">
          <button type="button" id="cancel-forgot-btn" class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors duration-300">
            ${r("Cancel")}
          </button>
          <button type="submit" id="send-verification-btn" class="flex-1 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded transition-colors duration-300">
            ${r("Send Verification Code")}
          </button>
        </div>
      </form>
    `}setupEventListeners(){const t=c("#forgot-password-form"),s=c("#cancel-forgot-btn");this.setupPasswordValidation(),this.setupConfirmPasswordValidation(),t&&t.addEventListener("submit",e=>this.handleSubmit(e)),s&&s.addEventListener("click",()=>this.close()),setTimeout(()=>{const e=c("#forgot-email");e&&e.focus()},100)}setupPasswordValidation(){const t=c("#forgot-password"),s=c("#password-error"),e=c("#length-req"),o=c("#chars-digits-req"),i=()=>{const n=t.value;let a=!0;t.classList.remove("border-red-500","border-green-500");const d=e?.querySelector("span");n.length>=8?d&&(d.className="text-green-400 text-xs",d.textContent=`✓ ${r("validation.password.lengthValid")||"At least 8 characters"}`):(d&&(d.className="text-red-400 text-xs",d.textContent=`✗ ${r("validation.password.length")||"At least 8 characters"}`),a=!1);const f=/[a-zA-Z]/.test(n),l=/\d/.test(n),m=f&&l,u=o?.querySelector("span");if(m?u&&(u.className="text-green-400 text-xs",u.textContent=`✓ ${r("validation.password.charsDigitsValid")||"Contains letters and numbers"}`):(u&&(u.className="text-red-400 text-xs",u.textContent=`✗ ${r("validation.password.charsDigits")||"Contains letters and numbers"}`),n.length>0&&(a=!1)),n.length===0)t.classList.remove("border-red-500","border-green-500"),s.classList.add("hidden");else if(a&&n.length>=8&&m)t.classList.remove("border-red-500"),t.classList.add("border-green-500"),s.classList.add("hidden");else if(n.length>0){t.classList.remove("border-green-500"),t.classList.add("border-red-500");let h="";n.length<8?h=r("validation.password.length")||"Password must be at least 8 characters":m||(h=r("validation.password.charsDigits")||"Password must contain both letters and numbers"),h&&(s.textContent=h,s.classList.remove("hidden"))}return this.validateConfirmPassword(),a};t?.addEventListener("keyup",i),t?.addEventListener("blur",i)}setupConfirmPasswordValidation(){const t=c("#forgot-confirm-password");c("#confirm-password-error"),t?.addEventListener("keyup",()=>{this.validateConfirmPassword()}),t?.addEventListener("blur",()=>{this.validateConfirmPassword()})}validateConfirmPassword(){const t=c("#forgot-password"),s=c("#forgot-confirm-password"),e=c("#confirm-password-error");if(!t||!s||!e)return!1;const o=t.value,i=s.value;return s.classList.remove("border-red-500","border-green-500"),i.length===0?(e.classList.add("hidden"),!0):o!==i?(e.textContent=r("Passwords do not match"),e.classList.remove("hidden"),s.classList.add("border-red-500"),!1):(e.classList.add("hidden"),s.classList.remove("border-red-500"),s.classList.add("border-green-500"),!0)}validateAllFields(){const t=c("#forgot-password"),s=c("#forgot-confirm-password");if(!t||!s)return!1;const e=t.value,o=s.value,i=/[a-zA-Z]/.test(e),n=/\d/.test(e),a=i&&n,d=e.length>=8&&a,f=e===o;return d||t.classList.add("border-red-500"),f||s.classList.add("border-red-500"),d&&f}async handleSubmit(t){t.preventDefault();const s=c("#forgot-email"),e=c("#forgot-password"),o=c("#forgot-confirm-password"),i=c("#send-verification-btn"),n=c("#forgot-password-error");if(!s||!e||!o||!i){console.error("❌ Required form elements not found");return}const a=s.value.trim(),d=e.value,f=o.value;if(n?.classList.add("hidden"),!a||!d||!f){this.showError("forgot-password-error",r("Please fill in all fields"));return}if(!this.validateAllFields()){this.showError("forgot-password-error",r("Please fix the validation errors above"));return}if(d!==f){this.showError("forgot-password-error",r("Passwords do not match"));return}i.disabled=!0,i.textContent=r("Sending...");try{console.log("🔐 Starting password reset for email:",a);const l=await g.initiatePasswordReset(a,d);l.success?(console.log("✅ Password reset initiated successfully"),this.close(),this.showPasswordResetVerificationModal(a,d),this.showToast("info",r("Verification Code Sent"),r("Please check your email and enter the verification code"))):l.message?.includes("not found")||l.message?.includes("404")?this.showError("forgot-password-error",r("Email address not found in our system")):this.showError("forgot-password-error",l.message||r("Failed to send verification code. Please try again."))}catch(l){console.error("❌ Error initiating password reset:",l),this.showError("forgot-password-error",r("Network error. Please try again."))}finally{i.disabled=!1,i.textContent=r("Send Verification Code")}}async showPasswordResetVerificationModal(t,s){try{console.log("📧 Showing password reset verification modal"),this.createPasswordResetVerificationModal(t,s)}catch(e){console.error("❌ Error showing verification modal:",e),this.showError("forgot-password-error",r("Unable to load verification modal. Please try again."))}}createPasswordResetVerificationModal(t,s){const e=document.createElement("div");e.className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50",e.id="password-reset-verify-modal",e.innerHTML=`
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-auto border border-gray-700">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-white">${r("Verify Password Reset")}</h2>
          <button id="close-password-reset-verify" class="text-gray-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto mb-4 bg-lime-500/20 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-lime-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <p class="text-gray-300 mb-2">${r("We sent a verification code to your email")}</p>
          <p class="text-lime-400 font-semibold">${t}</p>
          <p class="text-gray-400 text-sm mt-2">${r("Enter the 6-digit code to reset your password")}</p>
        </div>

        <form id="password-reset-verify-form">
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-3 text-center">${r("Verification Code")}</label>
            <div class="flex justify-center space-x-2 mb-2">
              <input type="text" id="reset-code-1" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-2" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-3" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-4" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-5" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
              <input type="text" id="reset-code-6" maxlength="1"
                     class="w-12 h-12 text-center text-xl font-bold bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors duration-300"
                     pattern="[0-9]" inputmode="numeric">
            </div>
            <div id="reset-verify-error" class="hidden mt-2 text-red-400 text-xs text-center"></div>
          </div>

          <div class="mb-4">
            <button type="submit" id="reset-verify-submit"
                    class="w-full bg-lime-500 hover:bg-lime-600 text-white font-bold py-3 px-4 rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              ${r("Reset Password")}
            </button>
          </div>
        </form>

        <div class="text-center">
          <p class="text-gray-400 text-sm mb-3">${r("Didn't receive the code?")}</p>
          <button id="reset-resend-code" class="text-lime-500 hover:text-lime-400 transition-colors duration-300 text-sm font-medium">
            ${r("Resend Code")}
          </button>
          <div id="reset-resend-timer" class="hidden text-gray-500 text-xs mt-1"></div>
        </div>
      </div>
    `,document.body.appendChild(e),this.setupPasswordResetVerifyListeners(t,s,e),setTimeout(()=>{const o=e.querySelector("#reset-code-1");o&&o.focus()},100)}setupPasswordResetVerifyListeners(t,s,e){const o=[e.querySelector("#reset-code-1"),e.querySelector("#reset-code-2"),e.querySelector("#reset-code-3"),e.querySelector("#reset-code-4"),e.querySelector("#reset-code-5"),e.querySelector("#reset-code-6")].filter(Boolean),i=e.querySelector("#password-reset-verify-form"),n=e.querySelector("#close-password-reset-verify"),a=e.querySelector("#reset-resend-code");o.forEach((d,f)=>{d.addEventListener("input",l=>{const m=l.target,u=m.value;if(!/^\d*$/.test(u)){m.value="";return}this.hideResetVerifyError(e),u&&f<o.length-1&&o[f+1].focus(),o.every(p=>p.value)&&setTimeout(()=>this.handlePasswordResetVerification(t,s,e),100)}),d.addEventListener("keydown",l=>{l.key==="Backspace"&&!d.value&&f>0&&o[f-1].focus()}),d.addEventListener("paste",l=>{l.preventDefault();const u=(l.clipboardData?.getData("text")||"").replace(/\D/g,"").slice(0,6);u.split("").forEach((h,p)=>{o[p]&&(o[p].value=h)}),u.length===6?(o[5].focus(),setTimeout(()=>this.handlePasswordResetVerification(t,s,e),100)):u.length>0&&o[Math.min(u.length-1,5)].focus()}),d.addEventListener("focus",()=>{d.select()})}),i&&i.addEventListener("submit",d=>{d.preventDefault(),this.handlePasswordResetVerification(t,s,e)}),n&&n.addEventListener("click",()=>{document.body.removeChild(e)}),a&&a.addEventListener("click",()=>{this.handleResendPasswordResetCode(t,s,e)}),e.addEventListener("click",d=>{d.target===e&&document.body.removeChild(e)})}async handlePasswordResetVerification(t,s,e){const i=[e.querySelector("#reset-code-1"),e.querySelector("#reset-code-2"),e.querySelector("#reset-code-3"),e.querySelector("#reset-code-4"),e.querySelector("#reset-code-5"),e.querySelector("#reset-code-6")].filter(Boolean).map(a=>a.value).join(""),n=e.querySelector("#reset-verify-submit");if(i.length!==6){this.showResetVerifyError(e,r("Please enter all 6 digits"));return}if(!/^\d{6}$/.test(i)){this.showResetVerifyError(e,r("Please enter numbers only"));return}n&&(n.disabled=!0,n.textContent=r("Resetting Password..."));try{const a=await g.completePasswordReset(t,i,s);a.success?(this.showResetVerifySuccess(e),setTimeout(()=>{document.body.removeChild(e),this.showToast("success",r("Password Reset Successful"),r("Your password has been updated successfully. You can now login."))},1500)):(this.showResetVerifyError(e,a.message||r("Invalid verification code")),this.clearResetVerifyInputs(e))}catch(a){console.error("❌ Error completing password reset:",a),this.showResetVerifyError(e,r("Network error. Please try again.")),this.clearResetVerifyInputs(e)}n&&(n.disabled=!1,n.textContent=r("Reset Password"))}async handleResendPasswordResetCode(t,s,e){const o=e.querySelector("#reset-resend-code"),i=e.querySelector("#reset-resend-timer");try{await g.resendPasswordResetCode(t,s),this.showToast("info",r("Code Resent"),r("A new verification code has been sent to your email")),o&&i&&this.startResetResendCooldown(o,i)}catch(n){console.error("❌ Failed to resend password reset code:",n),this.showToast("error","Error","Failed to resend verification code")}}startResetResendCooldown(t,s){let e=30;t.disabled=!0,t.textContent=r("Code Sent"),s.classList.remove("hidden");const o=setInterval(()=>{s.textContent=`You can request a new code in ${e} seconds`,e--,e<0&&(clearInterval(o),t.disabled=!1,t.textContent=r("Resend Code"),s.classList.add("hidden"))},1e3)}showResetVerifyError(t,s){const e=t.querySelector("#reset-verify-error"),o=[t.querySelector("#reset-code-1"),t.querySelector("#reset-code-2"),t.querySelector("#reset-code-3"),t.querySelector("#reset-code-4"),t.querySelector("#reset-code-5"),t.querySelector("#reset-code-6")].filter(Boolean);e&&(e.textContent=s,e.classList.remove("hidden")),o.forEach(i=>{i.classList.add("border-red-500"),i.classList.remove("border-lime-500")})}showResetVerifySuccess(t){const s=t.querySelector("#reset-verify-error"),e=[t.querySelector("#reset-code-1"),t.querySelector("#reset-code-2"),t.querySelector("#reset-code-3"),t.querySelector("#reset-code-4"),t.querySelector("#reset-code-5"),t.querySelector("#reset-code-6")].filter(Boolean);s&&(s.textContent=r("Password reset successful!"),s.className="mt-2 text-lime-400 text-xs text-center",s.classList.remove("hidden")),e.forEach(o=>{o.classList.add("border-lime-500"),o.classList.remove("border-red-500")})}hideResetVerifyError(t){const s=t.querySelector("#reset-verify-error"),e=[t.querySelector("#reset-code-1"),t.querySelector("#reset-code-2"),t.querySelector("#reset-code-3"),t.querySelector("#reset-code-4"),t.querySelector("#reset-code-5"),t.querySelector("#reset-code-6")].filter(Boolean);s&&s.classList.add("hidden"),e.forEach(o=>{o.classList.remove("border-red-500")})}clearResetVerifyInputs(t){const s=[t.querySelector("#reset-code-1"),t.querySelector("#reset-code-2"),t.querySelector("#reset-code-3"),t.querySelector("#reset-code-4"),t.querySelector("#reset-code-5"),t.querySelector("#reset-code-6")].filter(Boolean);s.forEach(e=>{e.value=""}),s[0]&&s[0].focus()}showModal(){this.show("forgot-password")}}export{y as ForgetPasswordModal};
