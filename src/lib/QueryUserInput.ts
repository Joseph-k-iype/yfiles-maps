/**
 * @license
 * This app exhibits yFiles for HTML functionalities.
 * Copyright (c) 2024 by yWorks GmbH, Vor dem Kreuzberg 28,
 * 72070 Tuebingen, Germany. All rights reserved.
 *
 * yFiles demo files exhibit yFiles for HTML functionalities.
 * Any redistribution of demo files in source code or binary form, with
 * or without modification, is not permitted.
 *
 * Owners of a valid software license for a yFiles for HTML
 * version are allowed to use the app source code as basis for their
 * own yFiles for HTML powered applications. Use of such programs is
 * governed by the rights and conditions as set out in the yFiles for HTML
 * license agreement. If in doubt, please mail to contact@yworks.com.
 *
 * THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 * NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

export async function queryUserInput(configuration: any): Promise<string> {
  const query = configuration.query || ''
  const defaultText = configuration.defaultText || ''
  const placeholder = configuration.placeholder || ''

  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.id = 'user-input-dialog'
    dialog.innerHTML = `
<div class="user-input-title">
  User Input
</div>
<form>
  <p>${query}</p>
  <input id="user-input" type="text" placeholder="${placeholder}" value="${defaultText}" />
  <div>
    <button id="confirm-btn" value="">Submit</button>
    <button value="cancel" formmethod="dialog">Cancel</button>
  </div>
</form>
  `

    dialog.querySelector('#confirm-btn')!.addEventListener('click', (e) => {
      e.preventDefault() // do not reload the page on form submit
      dialog.close(
        (dialog.querySelector('#user-input') as HTMLInputElement).value
      )
    })

    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue)
      document.body.removeChild(dialog)
    })

    document.body.appendChild(dialog)

    dialog.showModal()
  })
}
